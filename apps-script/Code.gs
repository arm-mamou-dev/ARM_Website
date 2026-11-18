/**
 * ARM – Association Des Ressortissants de Mamou
 * Google Sheets backend for the website.
 *
 * POST { action: "register", firstName, lastName, phone, group, subpref, state, texts }   (texts: "Yes" = agreed to receive texts)
 *   phone already in Members? -> yes: { status: "duplicate", memberId }
 *                             -> no:  assign ARM-#### ID, format phone, append row (Status = Pending)
 *
 * POST { action: "lookup", memberId, phone }
 *   Member ID + phone must both match -> { status: "ok", member: {...} }  (phone itself is never returned)
 *
 * GET                   -> { status: "ok", count, bySubpref }   (member counts, total and per sub-prefecture)
 * GET ?action=projects  -> { status: "ok", projects }   (Projects + Project Phases tabs)
 *
 * Leadership manages each member's Status (Pending / Active / Inactive) directly in the sheet.
 * Texts column: Yes = the member agreed to receive text messages (see Texts.gs). Only set it to Yes with the member's consent.
 */

const SHEET_NAME = 'Members';
const HEADERS = ['Member ID', 'Registered At', 'First Name', 'Last Name', 'Phone', 'Group', 'Sub-prefecture', 'State of Residence', 'Status', 'Texts'];
const COL = { id: 0, date: 1, first: 2, last: 3, phone: 4, group: 5, subpref: 6, state: 7, status: 8, texts: 9 };
const GROUPS = ['Male', 'Female'];
// ARM is a federation: every member belongs to one of Mamou's communes / sub-prefectures
const SUBPREFS = ['Mamou-Centre', 'Bouliwel', 'Dounet', 'Gongoret', 'Kégnéko', 'Konkouré', "N'yagara",
                  'Ouré-Kaba', 'Porédaka', 'Saramoussaya', 'Soyah', 'Téguéréya', 'Timbo', 'Tolo'];
const STATUSES = ['Pending', 'Active', 'Inactive'];
const DEFAULT_STATUS = 'Pending';
const MAX_LOOKUPS_PER_10_MIN = 10;

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (data.action === 'lookup') return json(lookup(data));
    if (String(data.action || '').indexOf('admin') === 0) return json(handleAdmin(data));   // see Admin.gs
    return json(register(data));
  } catch (err) {
    return json({ status: 'error', message: String(err) });
  }
}

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'projects') return json({ status: 'ok', projects: getProjects() });
  const rows = readRows(getSheet());
  const bySubpref = {};
  rows.forEach(r => { if (r[COL.subpref]) bySubpref[r[COL.subpref]] = (bySubpref[r[COL.subpref]] || 0) + 1; });
  return json({ status: 'ok', count: rows.length, bySubpref: bySubpref });
}

/** Run once from the editor to create / upgrade all tabs (Members, Projects, Project Phases, Admins, Transactions). */
function setup() {
  getSheet();
  setupProjects();
  setupAdmin();
}

// ---------- projects ----------
// Leadership edits these tabs directly; the website's Projects page reads them.

const PROJECTS_SHEET = 'Projects';
const PHASES_SHEET = 'Project Phases';
// 'Part of' = Project ID of the parent project, for sections (e.g. Education in the USA is part of EDU)
const PROJECT_HEADERS = ['Project ID', 'Title', 'Summary', 'Status', 'Start', 'End', 'Goal ($)', 'Raised ($)', 'Show on website', 'Part of'];
const PHASE_HEADERS = ['Project ID', 'Phase', 'Start', 'End', 'Status'];

function setupProjects() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const header = (sheet, headers) => {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#2c4170').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  };
  const list = (sheet, col, values) => sheet.getRange(2, col, sheet.getMaxRows() - 1, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(values, true).build());

  let projects = ss.getSheetByName(PROJECTS_SHEET);
  if (!projects) {
    projects = ss.insertSheet(PROJECTS_SHEET);
    header(projects, PROJECT_HEADERS);
    projects.appendRow(['BLDG', 'Purchase a Building',
      'Purchase a permanent building for the association, funded by the Mamou community. Progress is reported monthly.',
      'In progress', new Date(2026, 9, 1), new Date(2027, 8, 30), 600000, 0, 'Yes', '']);
    projects.appendRow(['EDU', 'Education',
      'ARM supports education for our community in two places: in the United States and in Mamou.',
      'Planned', '', '', '', 0, 'Yes', '']);
    projects.appendRow(['EDU-USA', 'Education in the USA',
      '',   // summary left empty: the site shows "being built" until leadership writes it
      'Planned', '', '', '', 0, 'Yes', 'EDU']);
    projects.appendRow(['EDU-MAMOU', 'Education in Mamou',
      '',   // summary left empty: the site shows "being built" until leadership writes it
      'Planned', '', '', '', 0, 'Yes', 'EDU']);
    list(projects, 4, ['Planned', 'In progress', 'Completed', 'On hold']);
    list(projects, 9, ['Yes', 'No']);
    projects.getRange('G:H').setNumberFormat('$#,##0');
    projects.getRange('E:F').setNumberFormat('mmm d, yyyy');
  }

  let phases = ss.getSheetByName(PHASES_SHEET);
  if (!phases) {
    phases = ss.insertSheet(PHASES_SHEET);
    header(phases, PHASE_HEADERS);
    [
      ['Organize', [2026, 9, 1], [2026, 10, 30]],
      ['Legal setup', [2026, 9, 12], [2027, 2, 31]],
      ['Mobilize members', [2026, 9, 26], [2027, 8, 30]],
      ['Fundraising campaigns', [2026, 9, 1], [2027, 7, 14]],
      ['Building search & financing', [2026, 11, 1], [2027, 3, 30]],
      ['Offer & contract', [2027, 4, 3], [2027, 6, 31]],
      ['Close & move in', [2027, 7, 2], [2027, 8, 30]],
    ].forEach(p => phases.appendRow(['BLDG', p[0], new Date(p[1][0], p[1][1], p[1][2]), new Date(p[2][0], p[2][1], p[2][2]), '']));
    list(phases, 5, ['Not started', 'In progress', 'Done', 'Delayed']);
    phases.getRange('C:D').setNumberFormat('mmm d, yyyy');
  }
}

function getProjects() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ps = ss.getSheetByName(PROJECTS_SHEET);
  if (!ps || ps.getLastRow() < 2) return [];
  const ph = ss.getSheetByName(PHASES_SHEET);
  const phaseRows = ph && ph.getLastRow() > 1 ? ph.getRange(2, 1, ph.getLastRow() - 1, PHASE_HEADERS.length).getValues() : [];
  const iso = v => (v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(v || ''));

  return ps.getRange(2, 1, ps.getLastRow() - 1, PROJECT_HEADERS.length).getValues()
    .filter(r => r[1] && String(r[8]).toLowerCase() !== 'no')
    .map(r => ({
      id: String(r[0]), title: r[1], summary: r[2], status: r[3] || 'Planned',
      start: iso(r[4]), end: iso(r[5]), goal: Number(r[6]) || 0, raised: Number(r[7]) || 0,
      parent: String(r[9] || ''),
      phases: phaseRows.filter(p => String(p[0]) === String(r[0]) && p[1])
        .map(p => ({ name: p[1], start: iso(p[2]), end: iso(p[3]), status: p[4] || '' })),
    }));
}

// ---------- actions ----------

function register(data) {
  // Honeypot: real people never fill this hidden field; bots do.
  if (data.website) return { status: 'ok', memberId: 'ARM-0000' };

  const firstName = clean(data.firstName);
  const lastName = clean(data.lastName);
  const group = clean(data.group);
  const subpref = clean(data.subpref);
  const state = clean(data.state);
  const digits = phoneDigits(data.phone);
  const texts = data.texts === 'Yes' ? 'Yes' : 'No';

  if (!firstName || !lastName || !state) return { status: 'error', message: 'Missing required fields.' };
  if (GROUPS.indexOf(group) === -1) return { status: 'error', message: 'Invalid group.' };
  if (SUBPREFS.indexOf(subpref) === -1) return { status: 'error', message: 'Invalid sub-prefecture.' };
  if (digits.length < 10) return { status: 'error', message: 'Invalid phone number.' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // prevents two people getting the same Member ID
  try {
    const sheet = getSheet();
    const rows = readRows(sheet);

    // Duplicate check by phone number (last 10 digits, so +1 / formatting doesn't matter)
    const key = digits.slice(-10);
    const existing = rows.find(r => phoneDigits(r[COL.phone]).slice(-10) === key);
    if (existing) return { status: 'duplicate', memberId: existing[COL.id] };

    const memberId = nextMemberId(rows);
    sheet.appendRow([memberId, new Date(), safeText(titleCase(firstName)), safeText(titleCase(lastName)),
                     formatPhone(digits), group, subpref, safeText(state), DEFAULT_STATUS, texts]);
    return { status: 'ok', memberId: memberId, memberStatus: DEFAULT_STATUS };
  } finally {
    lock.releaseLock();
  }
}

function lookup(data) {
  const id = normalizeId(data.memberId);
  const digits = phoneDigits(data.phone).slice(-10);
  if (!id || digits.length < 10) return { status: 'not_found' };

  // Throttle repeated attempts against the same Member ID
  const cache = CacheService.getScriptCache();
  const tries = Number(cache.get('lookup:' + id) || 0);
  if (tries >= MAX_LOOKUPS_PER_10_MIN) return { status: 'too_many' };
  cache.put('lookup:' + id, String(tries + 1), 600);

  const row = readRows(getSheet()).find(r =>
    String(r[COL.id]).toUpperCase() === id && phoneDigits(r[COL.phone]).slice(-10) === digits);
  if (!row) return { status: 'not_found' };

  cache.remove('lookup:' + id);
  const date = row[COL.date] instanceof Date ? row[COL.date].toISOString() : String(row[COL.date]);
  return {
    status: 'ok',
    member: {
      memberId: row[COL.id],
      firstName: row[COL.first],
      lastName: row[COL.last],
      group: row[COL.group],
      subpref: row[COL.subpref],
      state: row[COL.state],
      registeredAt: date,
      memberStatus: row[COL.status] || DEFAULT_STATUS,
      phoneLast4: digits.slice(-4),
    },
  };
}

// ---------- helpers ----------

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  const header = sheet.getLastRow() ? sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0] : [];
  if (header.join('|') !== HEADERS.join('|')) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
      .setFontWeight('bold').setBackground('#2c4170').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.getRange('E:E').setNumberFormat('@'); // keep phone as text
    // Dropdowns for leadership
    sheet.getRange(2, COL.subpref + 1, sheet.getMaxRows() - 1, 1)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(SUBPREFS, true).build());
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build();
    sheet.getRange(2, COL.status + 1, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
    sheet.getRange(2, COL.texts + 1, sheet.getMaxRows() - 1, 1)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Yes', 'No'], true).build());
    // Existing rows without a status become Pending
    if (sheet.getLastRow() > 1) {
      const rng = sheet.getRange(2, COL.status + 1, sheet.getLastRow() - 1, 1);
      rng.setValues(rng.getValues().map(v => [v[0] || DEFAULT_STATUS]));
    }
  }
  return sheet;
}

function readRows(sheet) {
  return sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues()
    : [];
}

function nextMemberId(rows) {
  let max = 0;
  rows.forEach(r => {
    const m = String(r[COL.id]).match(/^ARM-(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return 'ARM-' + String(max + 1).padStart(4, '0');
}

/** "arm-12", "ARM0012", "12" -> "ARM-0012" */
function normalizeId(v) {
  const m = String(v || '').match(/(\d+)/);
  return m ? 'ARM-' + String(Number(m[1])).padStart(4, '0') : '';
}

function phoneDigits(v) {
  return String(v || '').replace(/\D/g, '');
}

/** US numbers -> 555-123-4567; international numbers -> +<digits>. */
function formatPhone(digits) {
  if (digits.length === 11 && digits[0] === '1') digits = digits.slice(1);
  if (digits.length === 10) return digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6);
  return '+' + digits;
}

function clean(v) {
  return String(v || '').trim().replace(/\s+/g, ' ').slice(0, 100);
}

function titleCase(s) {
  return s.toLowerCase().replace(/(^|[\s'-])\S/g, c => c.toUpperCase());
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
