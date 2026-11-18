/**
 * ARM – admin area: bank transactions.
 *
 * Bank data is kept in a SEPARATE spreadsheet ("ARM Finances – private") created by setup(), so sharing the
 * member spreadsheet with leadership never exposes transactions. Only that file's owner can open it.
 *
 * Admins sign in on admin.html with their Google account. Every admin request carries the
 * Google ID token; it is verified with Google and the email must be listed in the "Admins" tab.
 *
 * Roles (Admins tab, "Role" column): Full = members + finances, Members = members only, Finance = finances only.
 *
 * Two ways to sign in:
 *   1. Google sign-in: idToken from Google, email must be in the Admins tab (with its Role).
 *   2. Shared "admin" username + password set from the spreadsheet menu (ARM Admin -> Set admin password).
 *      POST { action: "adminLogin", username, password } -> { status, token }   (send token as idToken afterwards)
 *      5 wrong passwords -> password login locked for 15 minutes. Sessions last up to 6 hours.
 *
 * POST { action: "adminMe",           idToken }                    -> { status, email, name, role }
 * POST { action: "adminMembers",      idToken }                    -> { status, members, statuses }      (Members/Full)
 * POST { action: "adminSetStatus",    idToken, memberId, status }  -> { status }                         (Members/Full)
 * POST { action: "adminTexts" / "adminSendText", ... }  text messages to members, see Texts.gs           (Members/Full)
 * POST { action: "adminTransactions", idToken }                    -> { status, transactions, categories }
 * POST { action: "adminImport",       idToken, csv, filename }     -> { status, format, added, skipped }
 * POST { action: "adminUpdate",       idToken, id, category, notes } -> { status }
 * POST { action: "adminAddTx",        idToken, date, description, amount, account, category, notes } -> { status, transaction }
 * POST { action: "adminDeleteTx",     idToken, id }   -> { status }   (manual entries only)
 * POST { action: "adminSplit",        idToken, id, lines: [{ amount, category, notes }] } -> { status }
 *      Lines must add up exactly to the transaction amount; [] removes the split.
 *
 * Errors: { status: "unauthorized" } (sign in again), { status: "forbidden" } (not an admin),
 *         { status: "not_configured" } (GOOGLE_CLIENT_ID below is empty).
 */

// OAuth Web client ID from Google Cloud Console (same value as GOOGLE_CLIENT_ID in the website's config.js)
const GOOGLE_CLIENT_ID = '';

const ADMINS_SHEET = 'Admins';
const ADMIN_HEADERS = ['Email', 'Name', 'Added', 'Role'];
const ROLES = ['Full', 'Members', 'Finance'];
const TX_SHEET = 'Transactions';
const TX_HEADERS = ['Transaction ID', 'Date', 'Description', 'Amount', 'Type', 'Balance', 'Account',
                    'Category', 'Notes', 'Imported At', 'Imported By', 'Source File'];
const TX = { id: 0, date: 1, desc: 2, amount: 3, type: 4, balance: 5, account: 6, category: 7, notes: 8 };
const CATEGORIES = ['Uncategorized', 'Donation', 'Membership dues', 'Building fund', 'Education', 'Event',
                    'Expense', 'Bank fee', 'Transfer', 'Refund', 'Other'];
const MAX_CSV_CHARS = 3000000;
const SPLITS_SHEET = 'Transaction Splits';
const SPLIT_HEADERS = ['Transaction ID', 'Line', 'Amount', 'Category', 'Notes'];
const SPLIT_CATEGORY = 'Split';          // parent transaction's category when it is split
const MAX_SPLIT_LINES = 20;

const ADMIN_USERNAME = 'admin';
const PASSWORD_ROLE = 'Full';            // what the shared admin login can see
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_FAILS = 5;            // then locked for LOCK_SECONDS
const LOCK_SECONDS = 900;
const SESSION_SECONDS = 21600;           // 6 hours (CacheService maximum)
const HASH_ROUNDS = 3000;

function handleAdmin(data) {
  if (data.action === 'adminLogin') return passwordLogin(String(data.username || ''), String(data.password || ''));
  if (data.action === 'adminLogout') {
    if (String(data.idToken || '').indexOf('pw:') === 0) CacheService.getScriptCache().remove('sess:' + sha(data.idToken));
    return { status: 'ok' };
  }
  const admin = requireAdmin(data.idToken);
  if (admin.status) return admin;               // unauthorized / forbidden / not_configured

  const can = area => admin.role === 'Full' || admin.role === area;
  const membersOnly = ['adminMembers', 'adminSetStatus', 'adminTexts', 'adminSendText'];
  if (membersOnly.indexOf(data.action) > -1 && !can('Members')) return { status: 'forbidden', email: admin.email };
  if (data.action !== 'adminMe' && membersOnly.indexOf(data.action) === -1 && !can('Finance')) return { status: 'forbidden', email: admin.email };

  switch (data.action) {
    case 'adminMe':
      return { status: 'ok', email: admin.email, name: admin.name, role: admin.role };
    case 'adminMembers':
      return { status: 'ok', members: readMembersForAdmin(), statuses: STATUSES };
    case 'adminSetStatus':
      return setMemberStatus(String(data.memberId || ''), String(data.status || ''));
    case 'adminTexts':
      return { status: 'ok', configured: !!twilioConfig(), log: readTextLog(), footer: TEXT_FOOTER, maxChars: MAX_TEXT_CHARS };
    case 'adminSendText':
      return sendTexts(data, admin);
    case 'adminTransactions':
      return { status: 'ok', transactions: readTransactions(), categories: CATEGORIES };
    case 'adminImport':
      return importTransactions(String(data.csv || ''), clean(data.filename), admin.email);
    case 'adminUpdate':
      return updateTransaction(String(data.id || ''), data.category, data.notes);
    case 'adminAddTx':
      return addManualTransaction(data, admin.email);
    case 'adminDeleteTx':
      return deleteManualTransaction(String(data.id || ''));
    case 'adminSplit':
      return splitTransaction(String(data.id || ''), data.lines);
    default:
      return { status: 'error', message: 'Unknown action.' };
  }
}

/** The private finance spreadsheet (created on first setup; its ID is kept in Script Properties). */
function financeSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FINANCE_SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  const ss = SpreadsheetApp.create('ARM Finances – private');
  props.setProperty('FINANCE_SPREADSHEET_ID', ss.getId());
  return ss;
}

/** Run once (part of setup) to create the private finance spreadsheet with Admins and Transactions tabs. */
function setupAdmin() {
  const ss = financeSpreadsheet();
  let admins = ss.getSheetByName(ADMINS_SHEET);
  if (!admins) {
    admins = ss.insertSheet(ADMINS_SHEET);
    styleHeader(admins, ADMIN_HEADERS);
    const me = Session.getEffectiveUser().getEmail();
    if (me) admins.appendRow([me, 'Owner', new Date(), 'Full']);
    // Remove the default empty "Sheet1"
    const blank = ss.getSheetByName('Sheet1');
    if (blank && ss.getSheets().length > 1) ss.deleteSheet(blank);
  }
  // Add the Role column to an older Admins tab, and a dropdown for it
  if (admins.getRange(1, 4).getValue() !== 'Role') styleHeader(admins, ADMIN_HEADERS);
  admins.getRange(2, 4, admins.getMaxRows() - 1, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(ROLES, true).build());

  let tx = ss.getSheetByName(TX_SHEET);
  if (!tx) {
    tx = ss.insertSheet(TX_SHEET);
    styleHeader(tx, TX_HEADERS);
    tx.getRange('D:D').setNumberFormat('$#,##0.00;-$#,##0.00');
    tx.getRange('F:F').setNumberFormat('$#,##0.00;-$#,##0.00');
    tx.getRange('B:B').setNumberFormat('mmm d, yyyy');
    tx.getRange(2, TX.category + 1, tx.getMaxRows() - 1, 1)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(CATEGORIES.concat([SPLIT_CATEGORY]), true).build());
  }
  if (!ss.getSheetByName(SPLITS_SHEET)) {
    const sp = ss.insertSheet(SPLITS_SHEET);
    styleHeader(sp, SPLIT_HEADERS);
    sp.getRange('C:C').setNumberFormat('$#,##0.00;-$#,##0.00');
    sp.getRange(2, 4, sp.getMaxRows() - 1, 1)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(CATEGORIES, true).build());
  }
}

function styleHeader(sheet, headers) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#2c4170').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
}

// ---------- authentication ----------

function requireAdmin(idToken) {
  if (!idToken) return { status: 'unauthorized' };
  if (String(idToken).indexOf('pw:') === 0) {
    const sess = CacheService.getScriptCache().get('sess:' + sha(idToken));
    return sess ? JSON.parse(sess) : { status: 'unauthorized' };
  }
  if (!GOOGLE_CLIENT_ID) return { status: 'not_configured' };

  const cache = CacheService.getScriptCache();
  const key = 'tok:' + sha(String(idToken));
  let info = null;
  const cached = cache.get(key);
  if (cached) {
    info = JSON.parse(cached);
  } else {
    const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
                                  { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return { status: 'unauthorized' };
    info = JSON.parse(res.getContentText());
  }

  const valid = info.aud === GOOGLE_CLIENT_ID &&
    (info.iss === 'accounts.google.com' || info.iss === 'https://accounts.google.com') &&
    String(info.email_verified) === 'true' &&
    Number(info.exp) * 1000 > Date.now();
  if (!valid) return { status: 'unauthorized' };
  if (!cached) cache.put(key, JSON.stringify(info), Math.min(300, Math.max(1, Number(info.exp) - Date.now() / 1000)));

  const email = String(info.email).toLowerCase();
  const sheet = financeSpreadsheet().getSheetByName(ADMINS_SHEET);
  const rows = sheet && sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues() : [];
  const row = rows.find(r => String(r[0]).trim().toLowerCase() === email);
  if (!row) return { status: 'forbidden', email: email };
  const role = ROLES.indexOf(String(row[3]).trim()) > -1 ? String(row[3]).trim() : 'Full';   // blank = Full
  return { email: email, name: row[1] || info.name || email, role: role };
}

// ---------- shared admin password ----------

/** Adds the "ARM Admin" menu to the spreadsheet. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('ARM Admin')
    .addItem('Set admin password…', 'setAdminPasswordFromMenu')
    .addItem('Turn off password login', 'clearAdminPassword')
    .addSeparator()
    .addItem('Set up texting (Twilio)…', 'setupTwilioFromMenu')
    .addItem('Turn off texting', 'clearTwilio')
    .addToUi();
}

/** Menu: asks for the new password twice, then stores only its salted hash. */
function setAdminPasswordFromMenu() {
  const ui = SpreadsheetApp.getUi();
  const a = ui.prompt('Set admin password', 'Username: ' + ADMIN_USERNAME + '\nNew password (at least ' + MIN_PASSWORD_LENGTH + ' characters):', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  const b = ui.prompt('Set admin password', 'Type the same password again:', ui.ButtonSet.OK_CANCEL);
  if (b.getSelectedButton() !== ui.Button.OK) return;
  if (a.getResponseText() !== b.getResponseText()) { ui.alert('The two passwords are different. Nothing was changed.'); return; }
  const res = setAdminPassword(a.getResponseText());
  ui.alert(res.status === 'ok' ? 'Admin password saved. Sign in on the website with username "' + ADMIN_USERNAME + '".' : res.message);
}

function setAdminPassword(password) {
  if (String(password).length < MIN_PASSWORD_LENGTH) return { status: 'error', message: 'The password must be at least ' + MIN_PASSWORD_LENGTH + ' characters.' };
  if (/^(admin|password|123456|azerty|qwerty)/i.test(password)) return { status: 'error', message: 'Please choose a less common password.' };
  const salt = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('ADMIN_PASSWORD', salt + ':' + hashPassword(password, salt));
  return { status: 'ok' };
}

function clearAdminPassword() {
  PropertiesService.getScriptProperties().deleteProperty('ADMIN_PASSWORD');
  try { SpreadsheetApp.getUi().alert('Password login is turned off. Google sign-in still works.'); } catch (e) {}
}

function hashPassword(password, salt) {
  let h = salt + ':' + password;
  for (let i = 0; i < HASH_ROUNDS; i++) h = sha(salt + h);
  return h;
}

function passwordLogin(username, password) {
  const stored = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!stored) return { status: 'password_off' };
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('pwfail') || 0);
  if (fails >= MAX_PASSWORD_FAILS) return { status: 'too_many' };

  const salt = stored.split(':')[0], hash = stored.split(':')[1];
  if (username.trim().toLowerCase() !== ADMIN_USERNAME || hashPassword(password, salt) !== hash) {
    cache.put('pwfail', String(fails + 1), LOCK_SECONDS);
    return { status: 'wrong_password' };
  }
  cache.remove('pwfail');
  const token = 'pw:' + Utilities.getUuid() + Utilities.getUuid();
  cache.put('sess:' + sha(token), JSON.stringify({ email: ADMIN_USERNAME + ' (password)', name: 'Admin', role: PASSWORD_ROLE }), SESSION_SECONDS);
  return { status: 'ok', token: token };
}

// ---------- members (admin view) ----------

function readMembersForAdmin() {
  return readRows(getSheet()).filter(r => r[COL.id]).map(r => ({
    memberId: String(r[COL.id]),
    registeredAt: r[COL.date] instanceof Date ? r[COL.date].toISOString() : String(r[COL.date]),
    firstName: String(r[COL.first]), lastName: String(r[COL.last]),
    phone: String(r[COL.phone]), group: String(r[COL.group]), subpref: String(r[COL.subpref]),
    state: String(r[COL.state]), status: String(r[COL.status] || DEFAULT_STATUS),
    texts: String(r[COL.texts]) === 'Yes' ? 'Yes' : 'No',
  }));
}

function setMemberStatus(memberId, status) {
  if (STATUSES.indexOf(status) === -1) return { status: 'error', message: 'Invalid status.' };
  const sheet = getSheet();
  const rows = readRows(sheet);
  const i = rows.findIndex(r => String(r[COL.id]) === memberId);
  if (i === -1) return { status: 'error', message: 'Member not found.' };
  sheet.getRange(i + 2, COL.status + 1).setValue(status);
  return { status: 'ok' };
}

// ---------- transactions ----------

function txSheet() {
  let sheet = financeSpreadsheet().getSheetByName(TX_SHEET);
  if (!sheet) { setupAdmin(); sheet = financeSpreadsheet().getSheetByName(TX_SHEET); }
  return sheet;
}

function splitsSheet() {
  let sheet = financeSpreadsheet().getSheetByName(SPLITS_SHEET);
  if (!sheet) { setupAdmin(); sheet = financeSpreadsheet().getSheetByName(SPLITS_SHEET); }
  return sheet;
}

function readSplits() {
  const sheet = splitsSheet();
  const by = {};
  if (sheet.getLastRow() < 2) return by;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, SPLIT_HEADERS.length).getValues().forEach(r => {
    if (!r[0]) return;
    (by[String(r[0])] = by[String(r[0])] || []).push({ line: Number(r[1]), amount: Number(r[2]) || 0, category: String(r[3]), notes: String(r[4] || '') });
  });
  Object.keys(by).forEach(k => by[k].sort((a, b) => a.line - b.line));
  return by;
}

function readTransactions() {
  const sheet = txSheet();
  if (sheet.getLastRow() < 2) return [];
  const splits = readSplits();
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, TX_HEADERS.length).getValues()
    .filter(r => r[TX.id])
    .map((r, i) => ({
      id: String(r[TX.id]),
      date: r[TX.date] instanceof Date ? Utilities.formatDate(r[TX.date], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(r[TX.date]),
      description: String(r[TX.desc]),
      amount: Number(r[TX.amount]) || 0,
      type: String(r[TX.type]),
      balance: r[TX.balance] === '' ? null : Number(r[TX.balance]),
      account: String(r[TX.account]),
      category: String(r[TX.category] || 'Uncategorized'),
      notes: String(r[TX.notes] || ''),
      splits: splits[String(r[TX.id])] || [],
      order: i,
    }));
}

function importTransactions(csv, filename, email) {
  if (!csv.trim()) return { status: 'error', message: 'The file is empty.' };
  if (csv.length > MAX_CSV_CHARS) return { status: 'error', message: 'The file is too large.' };

  const parsed = parseBankCsv(csv);
  if (parsed.error) return { status: 'error', message: parsed.error };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = txSheet();
    const existing = new Set(sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().map(r => String(r[0])) : []);
    const now = new Date();
    const fresh = parsed.rows.filter(t => !existing.has(t.id));
    if (fresh.length) {
      const values = fresh.map(t => [t.id, t.date, safeText(t.description), t.amount, safeText(t.type),
        t.balance === null ? '' : t.balance, parsed.account, 'Uncategorized', '', now, email, safeText(filename)]);
      sheet.getRange(sheet.getLastRow() + 1, 1, values.length, TX_HEADERS.length).setValues(values);
    }
    return { status: 'ok', format: parsed.account, added: fresh.length, skipped: parsed.rows.length - fresh.length };
  } finally {
    lock.releaseLock();
  }
}

function updateTransaction(id, category, notes) {
  const sheet = txSheet();
  if (sheet.getLastRow() < 2) return { status: 'error', message: 'Not found.' };
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  const i = ids.findIndex(r => String(r[0]) === id);
  if (i === -1) return { status: 'error', message: 'Not found.' };
  // "Split" is only set by adminSplit; a split transaction keeps it when its notes are edited
  const current = String(sheet.getRange(i + 2, TX.category + 1).getValue());
  const ok = CATEGORIES.indexOf(category) > -1 || (category === SPLIT_CATEGORY && current === SPLIT_CATEGORY);
  if (!ok) return { status: 'error', message: 'Invalid category.' };
  sheet.getRange(i + 2, TX.category + 1, 1, 2).setValues([[category, safeText(String(notes || '').slice(0, 300))]]);
  return { status: 'ok' };
}

const MANUAL_TYPE = 'MANUAL';

/** Adds a transaction typed in on the admin page (cash, or money not yet at the bank). */
function addManualTransaction(data, email) {
  const date = parseDate(String(data.date || ''));
  const description = clean(data.description).slice(0, 300);
  const amount = Math.round(Number(data.amount) * 100) / 100;
  const account = clean(data.account).slice(0, 60) || 'Cash';
  const category = String(data.category || 'Uncategorized');
  if (!date) return { status: 'error', message: 'Enter a valid date.' };
  if (date > new Date(Date.now() + 86400000 * 366)) return { status: 'error', message: 'The date is too far in the future.' };
  if (!description) return { status: 'error', message: 'Enter a description.' };
  if (!amount || isNaN(amount) || Math.abs(amount) > 10000000) return { status: 'error', message: 'Enter a valid amount.' };
  if (CATEGORIES.indexOf(category) === -1) return { status: 'error', message: 'Invalid category.' };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = txSheet();
    const id = 'M-' + Utilities.getUuid().replace(/-/g, '').slice(0, 18);
    sheet.appendRow([id, date, safeText(description), amount, MANUAL_TYPE, '', safeText(account), category,
                     safeText(String(data.notes || '').slice(0, 300)), new Date(), email, 'Manual entry']);
    return { status: 'ok', transaction: { id: id, date: isoDate(date), description: description, amount: amount,
      type: MANUAL_TYPE, balance: null, account: account, category: category, notes: String(data.notes || '').slice(0, 300), splits: [] } };
  } finally {
    lock.releaseLock();
  }
}

/** Deletes a manual entry (and its split lines). Imported bank transactions cannot be deleted. */
function deleteManualTransaction(id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = txSheet();
    if (sheet.getLastRow() < 2) return { status: 'error', message: 'Not found.' };
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, TX_HEADERS.length).getValues();
    const i = rows.findIndex(r => String(r[TX.id]) === id);
    if (i === -1) return { status: 'error', message: 'Not found.' };
    if (String(rows[i][TX.type]) !== MANUAL_TYPE) return { status: 'error', message: 'Only manual entries can be deleted.' };
    sheet.deleteRow(i + 2);
    const sp = splitsSheet();
    if (sp.getLastRow() > 1) {
      const ids = sp.getRange(2, 1, sp.getLastRow() - 1, 1).getValues();
      for (let r = ids.length - 1; r >= 0; r--) if (String(ids[r][0]) === id) sp.deleteRow(r + 2);
    }
    return { status: 'ok' };
  } finally {
    lock.releaseLock();
  }
}

/** Replaces the split lines of one transaction. Lines must add up to the transaction amount. */
function splitTransaction(id, lines) {
  if (!Array.isArray(lines)) return { status: 'error', message: 'Invalid lines.' };
  if (lines.length > MAX_SPLIT_LINES) return { status: 'error', message: 'Too many lines.' };
  const cents = v => Math.round(Number(v) * 100);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const tx = txSheet();
    if (tx.getLastRow() < 2) return { status: 'error', message: 'Not found.' };
    const rows = tx.getRange(2, 1, tx.getLastRow() - 1, TX_HEADERS.length).getValues();
    const i = rows.findIndex(r => String(r[TX.id]) === id);
    if (i === -1) return { status: 'error', message: 'Not found.' };
    const total = cents(rows[i][TX.amount]);

    const clean = [];
    for (let n = 0; n < lines.length; n++) {
      const l = lines[n] || {};
      const c = cents(l.amount);
      if (!c || isNaN(c)) return { status: 'error', message: 'Every line needs an amount.' };
      if (Math.sign(c) !== Math.sign(total)) return { status: 'error', message: 'Line amounts must have the same sign as the transaction.' };
      if (CATEGORIES.indexOf(l.category) === -1) return { status: 'error', message: 'Invalid category.' };
      clean.push([id, n + 1, c / 100, l.category, safeText(String(l.notes || '').slice(0, 300))]);
    }
    if (clean.length === 1) return { status: 'error', message: 'A split needs at least two lines.' };
    if (clean.length && clean.reduce((s, l) => s + cents(l[2]), 0) !== total) {
      return { status: 'error', message: 'The lines must add up to the transaction amount.' };
    }

    // Remove the old lines for this transaction (bottom-up so row numbers stay valid)
    const sp = splitsSheet();
    if (sp.getLastRow() > 1) {
      const ids = sp.getRange(2, 1, sp.getLastRow() - 1, 1).getValues();
      for (let r = ids.length - 1; r >= 0; r--) if (String(ids[r][0]) === id) sp.deleteRow(r + 2);
    }
    if (clean.length) sp.getRange(sp.getLastRow() + 1, 1, clean.length, SPLIT_HEADERS.length).setValues(clean);

    const current = String(rows[i][TX.category]);
    const parentCategory = clean.length ? SPLIT_CATEGORY : (current === SPLIT_CATEGORY ? 'Uncategorized' : current);
    tx.getRange(i + 2, TX.category + 1).setValue(parentCategory);
    return { status: 'ok', category: parentCategory };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Reads a bank CSV export. Supports:
 *   Chase checking/savings: Details, Posting Date, Description, Amount, Type, Balance, Check or Slip #
 *   Chase credit card:      Transaction Date, Post Date, Description, Category, Type, Amount, Memo
 *   Generic:                Date, Description, Amount  (or Debit / Credit columns)
 */
function parseBankCsv(text) {
  const rows = Utilities.parseCsv(text.replace(/^﻿/, ''));
  if (rows.length < 2) return { error: 'No transactions found in the file.' };
  const head = rows[0].map(h => String(h).trim().toLowerCase());
  const col = name => head.indexOf(name);

  let account, dateCol, amountCol, balanceCol = -1, typeCol = -1, debitCol = -1, creditCol = -1;
  if (col('posting date') > -1 && col('amount') > -1) {
    account = 'Chase checking'; dateCol = col('posting date'); amountCol = col('amount');
    balanceCol = col('balance'); typeCol = col('type');
  } else if (col('transaction date') > -1 && col('amount') > -1) {
    account = 'Chase credit card'; dateCol = col('transaction date'); amountCol = col('amount'); typeCol = col('type');
  } else if (col('date') > -1 && (col('amount') > -1 || col('debit') > -1 || col('credit') > -1)) {
    account = 'Bank'; dateCol = col('date'); amountCol = col('amount');
    debitCol = col('debit'); creditCol = col('credit'); balanceCol = col('balance'); typeCol = col('type');
  } else {
    return { error: 'Unrecognized file. Download the CSV from chase.com (Account activity → Download).' };
  }
  const descCol = col('description');
  if (descCol === -1) return { error: 'The file has no Description column.' };

  const seen = {};
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(c => String(c).trim() === '')) continue;
    const date = parseDate(r[dateCol]);
    let amount = amountCol > -1 ? money(r[amountCol]) : money(r[creditCol]) - Math.abs(money(r[debitCol]));
    if (!date || isNaN(amount)) return { error: 'Could not read row ' + (i + 1) + ' of the file.' };
    const balance = balanceCol > -1 && String(r[balanceCol]).trim() !== '' ? money(r[balanceCol]) : null;
    const description = String(r[descCol] || '').trim().replace(/\s+/g, ' ').slice(0, 300);
    const type = typeCol > -1 ? String(r[typeCol] || '').trim() : '';

    // Same transaction imported twice -> same ID (identical rows in one file are numbered)
    const base = [account, isoDate(date), description, amount.toFixed(2), balance === null ? '' : balance.toFixed(2)].join('|');
    seen[base] = (seen[base] || 0) + 1;
    out.push({ id: sha(base + '#' + seen[base]).slice(0, 20), date: date, description: description,
               amount: amount, type: type, balance: balance });
  }
  if (!out.length) return { error: 'No transactions found in the file.' };
  return { account: account, rows: out };
}

function parseDate(v) {
  const s = String(v || '').trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);           // 10/03/2026
  if (m) return new Date(Number(m[3].length === 2 ? '20' + m[3] : m[3]), Number(m[1]) - 1, Number(m[2]));
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);                         // 2026-10-03
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return null;
}

function isoDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function money(v) {
  let s = String(v === undefined || v === null ? '' : v).trim();
  if (!s) return 0;
  const neg = /^\(.*\)$/.test(s);
  s = s.replace(/[()$,\s]/g, '');
  const n = Number(s);
  return neg ? -Math.abs(n) : n;
}

function sha(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
}

/** Stops text that starts with = + - @ from being run as a spreadsheet formula. */
function safeText(s) {
  s = String(s === undefined || s === null ? '' : s);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}
