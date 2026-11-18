/**
 * ARM – text messages (SMS) to members, sent through Twilio.
 *
 * Admins with the Members or Full role write a message on admin.html (Texts tab) and send it to every
 * Active member who agreed to receive texts (Members tab, "Texts" column = Yes), optionally filtered by
 * group, sub-prefecture and state. "{first}" in the message is replaced by each member's first name.
 * Every text ends with TEXT_FOOTER (who it is from + how to stop).
 *
 * Twilio credentials are kept in Script Properties, set from the spreadsheet menu
 * ARM Admin -> Set up texting (Twilio)…   (never put them in this file).
 *
 * POST { action: "adminTexts",    idToken } -> { status, configured, log, footer, maxChars }
 * POST { action: "adminSendText", idToken, message, group, subpref, state }
 *      -> { status, recipients, sent, failed, optedOut, errors }
 * POST { action: "adminSendText", idToken, message, testPhone }   sends to that one number only (a test)
 *
 * A member who replies STOP is blocked by Twilio; the next send to them fails with error 21610 and their
 * Texts column is set to No automatically. Each send (not tests) is recorded on the "Text Log" tab.
 */

const TEXT_LOG_SHEET = 'Text Log';
const TEXT_LOG_HEADERS = ['Sent At', 'Sent By', 'Message', 'Audience', 'Recipients', 'Sent', 'Failed', 'Errors'];
const MAX_TEXT_CHARS = 640;                // up to 4–5 SMS segments per member
const TEXT_FOOTER = '\n\nARM Mamou - Reply STOP to opt out / STOP pour vous désabonner';
const TWILIO_BATCH = 25;                   // requests sent in parallel
const TWILIO_OPTED_OUT = 21610;            // "Attempt to send to unsubscribed recipient"
const TEXT_LOG_ROWS = 50;                  // history shown on the admin page

// ---------- setup (spreadsheet menu) ----------

function twilioConfig() {
  const p = PropertiesService.getScriptProperties();
  const sid = p.getProperty('TWILIO_ACCOUNT_SID'), token = p.getProperty('TWILIO_AUTH_TOKEN'), from = p.getProperty('TWILIO_FROM');
  return sid && token && from ? { sid: sid, token: token, from: from } : null;
}

/** Menu: asks for the Twilio Account SID, Auth Token and sender (phone number or Messaging Service SID). */
function setupTwilioFromMenu() {
  const ui = SpreadsheetApp.getUi();
  const ask = (text) => {
    const r = ui.prompt('Set up texting (Twilio)', text, ui.ButtonSet.OK_CANCEL);
    return r.getSelectedButton() === ui.Button.OK ? r.getResponseText().trim() : null;
  };
  const sid = ask('Account SID (starts with AC), from the Twilio Console home page:');
  if (sid === null) return;
  if (!/^AC[0-9a-f]{32}$/i.test(sid)) { ui.alert('That does not look like an Account SID (AC + 32 characters). Nothing was changed.'); return; }
  const token = ask('Auth Token (Twilio Console home page → Auth Token → Show):');
  if (token === null) return;
  if (!/^[0-9a-f]{32}$/i.test(token)) { ui.alert('That does not look like an Auth Token (32 characters). Nothing was changed.'); return; }
  const from = ask('Send from: your Twilio phone number (e.g. +15551234567) or a Messaging Service SID (starts with MG):');
  if (from === null) return;
  const fromOk = /^MG[0-9a-f]{32}$/i.test(from) || /^\+\d{10,15}$/.test(from.replace(/[\s()-]/g, ''));
  if (!fromOk) { ui.alert('Enter the number as +1 and 10 digits, or a Messaging Service SID. Nothing was changed.'); return; }

  // Check the credentials before saving them
  const res = UrlFetchApp.fetch('https://api.twilio.com/2010-04-01/Accounts/' + sid + '.json',
    { headers: { Authorization: 'Basic ' + Utilities.base64Encode(sid + ':' + token) }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) { ui.alert('Twilio did not accept this Account SID / Auth Token. Nothing was changed.'); return; }

  PropertiesService.getScriptProperties().setProperties({
    TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token,
    TWILIO_FROM: from.indexOf('MG') === 0 ? from : from.replace(/[\s()-]/g, ''),
  });
  ui.alert('Texting is set up. Send yourself a test from the Texts tab on the admin page.');
}

function clearTwilio() {
  const p = PropertiesService.getScriptProperties();
  ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM'].forEach(k => p.deleteProperty(k));
  try { SpreadsheetApp.getUi().alert('Texting is turned off. The Twilio credentials were removed.'); } catch (e) {}
}

// ---------- sending ----------

function sendTexts(data, admin) {
  const message = String(data.message || '').replace(/\r\n/g, '\n').trim();
  if (!message) return { status: 'error', message: 'Write a message first.' };
  if (message.length > MAX_TEXT_CHARS) return { status: 'error', message: 'The message is too long (' + MAX_TEXT_CHARS + ' characters maximum).' };
  const cfg = twilioConfig();
  if (!cfg) return { status: 'not_set_up' };

  const isTest = data.testPhone !== undefined && data.testPhone !== null && data.testPhone !== '';
  let recipients, audience = '';
  if (isTest) {
    const d = phoneDigits(data.testPhone);
    if (d.length < 10) return { status: 'error', message: 'Enter a valid phone number for the test.' };
    recipients = [{ row: -1, phone: d, first: String(admin.name || '').split(/[\s@(]/)[0] || 'Test' }];
  } else {
    const group = clean(data.group), subpref = clean(data.subpref), state = clean(data.state);
    recipients = [];
    readRows(getSheet()).forEach((r, i) => {
      if (String(r[COL.status]) !== 'Active' || String(r[COL.texts]) !== 'Yes') return;
      if ((group && r[COL.group] !== group) || (subpref && r[COL.subpref] !== subpref) || (state && r[COL.state] !== state)) return;
      if (phoneDigits(r[COL.phone]).length >= 10) recipients.push({ row: i + 2, phone: phoneDigits(r[COL.phone]), first: String(r[COL.first]) });
    });
    if (!recipients.length) return { status: 'error', message: 'No member matches this selection.' };
    audience = ['Active, agreed to texts', group, subpref, state].filter(Boolean).join(' · ');
  }

  // One send at a time, so a double click can never text everyone twice
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return { status: 'busy' };
  try {
    const url = 'https://api.twilio.com/2010-04-01/Accounts/' + cfg.sid + '/Messages.json';
    const auth = 'Basic ' + Utilities.base64Encode(cfg.sid + ':' + cfg.token);
    const sender = cfg.from.indexOf('MG') === 0 ? { MessagingServiceSid: cfg.from } : { From: cfg.from };
    let sent = 0;
    const optedOutRows = [], errors = {};

    for (let i = 0; i < recipients.length; i += TWILIO_BATCH) {
      const batch = recipients.slice(i, i + TWILIO_BATCH);
      const responses = UrlFetchApp.fetchAll(batch.map(r => ({
        url: url, method: 'post', muteHttpExceptions: true, headers: { Authorization: auth },
        payload: Object.assign({ To: toE164(r.phone), Body: message.replace(/\{first\}/gi, r.first) + TEXT_FOOTER }, sender),
      })));
      responses.forEach((res, j) => {
        if (res.getResponseCode() < 300) { sent++; return; }
        let err = {};
        try { err = JSON.parse(res.getContentText()); } catch (e) {}
        if (err.code === TWILIO_OPTED_OUT && batch[j].row > 0) optedOutRows.push(batch[j].row);
        const key = err.code ? err.code + ': ' + String(err.message || '').slice(0, 120) : 'HTTP ' + res.getResponseCode();
        errors[key] = (errors[key] || 0) + 1;
      });
    }

    // Members who replied STOP: stop texting them
    if (optedOutRows.length) {
      const sheet = getSheet();
      optedOutRows.forEach(row => sheet.getRange(row, COL.texts + 1).setValue('No'));
    }
    const failed = recipients.length - sent;
    const errorList = Object.keys(errors).map(k => k + (errors[k] > 1 ? ' (×' + errors[k] + ')' : ''));
    if (!isTest) {
      textLogSheet().appendRow([new Date(), admin.email, safeText(message), audience, recipients.length, sent, failed, errorList.join('\n')]);
    }
    return { status: 'ok', test: isTest, recipients: recipients.length, sent: sent, failed: failed,
             optedOut: optedOutRows.length, errors: errorList };
  } finally {
    lock.releaseLock();
  }
}

/** 5551234567 / 15551234567 -> +15551234567; other numbers are taken as international (+<digits>). */
function toE164(digits) {
  if (digits.length === 10) return '+1' + digits;
  return '+' + digits;
}

// ---------- log ----------

function textLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TEXT_LOG_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(TEXT_LOG_SHEET);
    styleHeader(sheet, TEXT_LOG_HEADERS);
    sheet.getRange('A:A').setNumberFormat('mmm d, yyyy h:mm am/pm');
    sheet.getRange('C:C').setWrap(true);
  }
  return sheet;
}

function readTextLog() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEXT_LOG_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const n = Math.min(TEXT_LOG_ROWS, sheet.getLastRow() - 1);
  return sheet.getRange(sheet.getLastRow() - n + 1, 1, n, TEXT_LOG_HEADERS.length).getValues().reverse().map(r => ({
    sentAt: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
    sentBy: String(r[1]), message: String(r[2]).replace(/^'/, ''), audience: String(r[3]),
    recipients: Number(r[4]) || 0, sent: Number(r[5]) || 0, failed: Number(r[6]) || 0, errors: String(r[7] || ''),
  }));
}
