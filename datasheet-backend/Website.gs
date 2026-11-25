/**
 * ARM website backend, connected to "ARM - DataSheet v1".
 *
 * This file lives in the DataSheet's own script project ("ARM Project"), next to
 * Members_Registration.gs (the Google Form copier). Both use the same script lock,
 * so a form answer and a website sign-up can never get the same Member ID.
 *
 * It ONLY appends rows to the Members tab, in columns A–I (+ T, Notes).
 * It never rewrites headers, formulas (J–V) or drop-downs.
 *
 * Members columns used:
 *   A Member ID | B Timestamp (text "yyyy-MM-dd HH:mm") | C First Name | D Last Name | E Phone #
 *   F Group | G State of Residence | H Sub-prefecture | I Status | T Notes
 *
 * POST { action: "register", firstName, lastName, phone, group, subpref, state, texts }
 *   phone already in Members -> { status: "duplicate", memberId }
 *   else -> next ARM-#### ID, row appended with Status = Pending -> { status: "ok", memberId }
 * POST { action: "lookup", memberId, phone }  -> Member ID AND phone must match (phone never returned)
 * GET                    -> { status: "ok", count, bySubpref }
 * GET ?action=projects   -> { status: "ok", projects: [] }  (project data comes in a later phase)
 */

const WEB = {
  SHEET: 'Members',
  COL: { id: 1, date: 2, first: 3, last: 4, phone: 5, group: 6, state: 7, subpref: 8, status: 9, notes: 20 },
  GROUPS: ['Male', 'Female'],
  SUBPREFS: ['Mamou-Centre', 'Bouliwel', 'Dounet', 'Gongoret', 'Kégnéko', 'Konkouré', "N'yagara",
             'Ouré-Kaba', 'Porédaka', 'Saramoussaya', 'Soyah', 'Téguéréya', 'Timbo', 'Tolo'],
  DEFAULT_STATUS: 'Pending',
  MAX_LOOKUPS_PER_10_MIN: 10,
};

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (data.action === 'lookup') return webJson_(webLookup_(data));
    if (String(data.action || '').indexOf('admin') === 0) {
      return webJson_({ status: 'error', message: 'Admin tools are not available yet.' });
    }
    return webJson_(webRegister_(data));
  } catch (err) {
    return webJson_({ status: 'error', message: 'Something went wrong. Please try again later.' });
  }
}

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'projects') return webJson_({ status: 'ok', projects: [] });
  const rows = webRows_();
  const bySubpref = {};
  rows.forEach(r => { const s = r[WEB.COL.subpref - 1]; if (s) bySubpref[s] = (bySubpref[s] || 0) + 1; });
  return webJson_({ status: 'ok', count: rows.length, bySubpref: bySubpref });
}

// ---------- actions ----------

function webRegister_(data) {
  if (data.website) return { status: 'ok', memberId: 'ARM-0000' };   // honeypot: bots fill this hidden field

  const first = webClean_(data.firstName), last = webClean_(data.lastName);
  const group = webClean_(data.group), subpref = webClean_(data.subpref), state = webClean_(data.state);
  const digits = webDigits_(data.phone);
  const texts = data.texts === 'Yes' ? 'Yes' : 'No';

  if (!first || !last || !state) return { status: 'error', message: 'Missing required fields.' };
  if (WEB.GROUPS.indexOf(group) === -1) return { status: 'error', message: 'Invalid group.' };
  if (WEB.SUBPREFS.indexOf(subpref) === -1) return { status: 'error', message: 'Invalid sub-prefecture.' };
  if (digits.length < 10) return { status: 'error', message: 'Invalid phone number.' };

  const lock = LockService.getScriptLock();   // same lock as Members_Registration.gs
  lock.waitLock(30000);
  try {
    const sheet = webSheet_();
    const rows = webRows_(sheet);
    const key = digits.slice(-10);
    const existing = rows.find(r => webDigits_(r[WEB.COL.phone - 1]).indexOf(key) !== -1);
    if (existing) return { status: 'duplicate', memberId: existing[WEB.COL.id - 1] };

    let max = 0;
    rows.forEach(r => { const m = String(r[WEB.COL.id - 1]).match(/^ARM-(\d+)$/); if (m) max = Math.max(max, Number(m[1])); });
    const memberId = 'ARM-' + String(max + 1).padStart(4, '0');
    const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

    const r = webLastIdRow_(sheet) + 1;
    sheet.getRange(r, 1, 1, 9).setNumberFormat('@').setValues([[
      memberId, stamp, webSafe_(webTitle_(first)), webSafe_(webTitle_(last)), webPhone_(digits),
      group, webSafe_(state), subpref, WEB.DEFAULT_STATUS,
    ]]);
    sheet.getRange(r, WEB.COL.notes).setValue('Registered on the website. Texts consent: ' + texts);
    return { status: 'ok', memberId: memberId, memberStatus: WEB.DEFAULT_STATUS };
  } finally {
    lock.releaseLock();
  }
}

function webLookup_(data) {
  const m = String(data.memberId || '').match(/(\d+)/);
  const id = m ? 'ARM-' + String(Number(m[1])).padStart(4, '0') : '';
  const key = webDigits_(data.phone).slice(-10);
  if (!id || key.length < 10) return { status: 'not_found' };

  const cache = CacheService.getScriptCache();
  const tries = Number(cache.get('lookup:' + id) || 0);
  if (tries >= WEB.MAX_LOOKUPS_PER_10_MIN) return { status: 'too_many' };
  cache.put('lookup:' + id, String(tries + 1), 600);

  const row = webRows_().find(r => String(r[WEB.COL.id - 1]).toUpperCase() === id &&
                                   webDigits_(r[WEB.COL.phone - 1]).indexOf(key) !== -1);
  if (!row) return { status: 'not_found' };
  cache.remove('lookup:' + id);

  const c = i => row[WEB.COL[i] - 1];
  return {
    status: 'ok',
    member: {
      memberId: c('id'), firstName: String(c('first')).trim(), lastName: String(c('last')).trim(),
      group: c('group'), subpref: c('subpref'), state: c('state'),
      registeredAt: String(c('date')).trim().replace(' ', 'T'), memberStatus: c('status') || WEB.DEFAULT_STATUS,
      phoneLast4: key.slice(-4),
    },
  };
}

// ---------- helpers ----------

function webSheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(WEB.SHEET);
  if (!sheet) throw new Error('Members tab not found');
  return sheet;
}

/** Last row that has a Member ID in column A (formula columns are ignored). */
function webLastIdRow_(sheet) {
  const ids = sheet.getRange(1, 1, sheet.getMaxRows(), 1).getDisplayValues();
  for (let i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]).trim()) return i + 1;
  return 1;
}

/** Member rows (columns A–I) that have a Member ID. */
function webRows_(sheet) {
  sheet = sheet || webSheet_();
  const last = webLastIdRow_(sheet);
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, 9).getDisplayValues().filter(r => String(r[0]).trim());
}

function webDigits_(v) { return String(v || '').replace(/\D/g, ''); }

/** Same format as the form copier: US -> 555-123-4567, other -> +<digits>. */
function webPhone_(d) {
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  if (d.length === 10) return d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
  return '+' + d;
}

function webClean_(v) { return String(v || '').trim().replace(/\s+/g, ' ').slice(0, 100); }
function webTitle_(s) { return s.toLowerCase().replace(/(^|[\s'-])\S/g, c => c.toUpperCase()); }
/** Stops a value from being read as a formula (=, +, -, @). */
function webSafe_(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }

function webJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Run by hand from the editor to check the connection without writing anything. */
function testWebsiteConnection() {
  const rows = webRows_();
  Logger.log('Members found: ' + rows.length + '. Next row to write: ' + (webLastIdRow_(webSheet_()) + 1));
}
