/**
 * ARM - DataSheet v1: add Google Form sign-ups to Members, without duplicates.
 *
 * Install (once, signed in as the sheet owner, arm202609@gmail.com):
 *   1. Open "ARM - DataSheet v1" > Extensions > Apps Script.
 *   2. Paste this file, save, then run installTrigger() and accept the permissions.
 *   3. Stop any other way of copying form rows into Members (manual copy or another script),
 *      otherwise every sign-up is added twice.
 *
 * On each form submission:
 *   - phone already in Members (last 9 digits match) -> not added; the response row is marked
 *     "Duplicate of ARM-00xx" in the first free column of Members_Registration.
 *   - otherwise -> added to Members with the next Member ID; the response row is marked "Added as ARM-00xx".
 * Members columns J onwards are formulas and fill themselves.
 */

const MEMBERS_TAB = 'Members';
const FORM_TAB = 'Members_Registration';
const RESULT_HEADER = 'Added to Members';

function installTrigger() {
  const ss = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'onFormSubmitToMembers')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onFormSubmitToMembers').forSpreadsheet(ss).onFormSubmit().create();
}

function onFormSubmitToMembers(e) {
  if (e.range.getSheet().getName() !== FORM_TAB) return;
  addResponseRow_(e.range.getRow());
}

/** Run by hand to process every response not yet marked (e.g. after installing). */
function processUnmarkedResponses() {
  const form = SpreadsheetApp.getActive().getSheetByName(FORM_TAB);
  const col = resultColumn_(form);
  const last = form.getLastRow();
  if (last < 2) return;
  const marks = form.getRange(2, col, last - 1, 1).getValues();
  marks.forEach((m, i) => { if (!m[0]) addResponseRow_(i + 2); });
}

function addResponseRow_(row) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActive();
    const form = ss.getSheetByName(FORM_TAB);
    const members = ss.getSheetByName(MEMBERS_TAB);
    const resultCol = resultColumn_(form);

    const header = form.getRange(1, 1, 1, form.getLastColumn()).getValues()[0].map(h => String(h).trim());
    const values = form.getRange(row, 1, 1, header.length).getValues()[0];
    const get = name => values[header.indexOf(name)];

    const phoneRaw = String(get('Phone #') || '');
    const digits = phoneRaw.replace(/\D/g, '');
    if (digits.length < 9) {
      form.getRange(row, resultCol).setValue('Not added: phone missing or too short');
      return;
    }
    const key = digits.slice(-9);

    const lastMember = Math.max(members.getLastRow(), 1);
    const existing = lastMember > 1 ? members.getRange(2, 1, lastMember - 1, 5).getValues() : [];
    const dup = existing.find(r => r[0] && String(r[4]).replace(/\D/g, '').indexOf(key) !== -1);
    if (dup) {
      form.getRange(row, resultCol).setValue('Duplicate of ' + dup[0]);
      return;
    }

    const maxId = existing.reduce((m, r) => {
      const n = Number(String(r[0]).replace(/\D/g, ''));
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    const memberId = 'ARM-' + String(maxId + 1).padStart(4, '0');

    const firstEmpty = existing.findIndex(r => !r[0]);
    const targetRow = firstEmpty === -1 ? existing.length + 2 : firstEmpty + 2;

    members.getRange(targetRow, 1, 1, 7).setValues([[
      memberId,
      Utilities.formatDate(new Date(get('Timestamp')), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm'),
      String(get('First Name') || '').trim(),
      String(get('Last Name') || '').trim(),
      formatPhone_(digits, phoneRaw),
      normalizeGroup_(get('Group')),
      String(get('State of Residence') || '').trim(),
    ]]);
    form.getRange(row, resultCol).setValue('Added as ' + memberId);
  } finally {
    lock.releaseLock();
  }
}

function resultColumn_(form) {
  const header = form.getRange(1, 1, 1, form.getLastColumn()).getValues()[0];
  const i = header.indexOf(RESULT_HEADER);
  if (i !== -1) return i + 1;
  const col = form.getLastColumn() + 1;
  form.getRange(1, col).setValue(RESULT_HEADER);
  return col;
}

function formatPhone_(digits, raw) {
  if (digits.length === 10) return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  if (digits.length === 11 && digits[0] === '1') return digits.slice(1).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  return raw.trim();
}

function normalizeGroup_(g) {
  const s = String(g || '').toLowerCase();
  if (s.indexOf('douh') !== -1 || s === 'male') return 'Douhii Bhe';
  if (s.indexOf('sonn') !== -1 || s === 'female') return 'Sonnaa Bhe';
  return String(g || '').trim();
}
