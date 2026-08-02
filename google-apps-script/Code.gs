/**
 * RSVP receiver for the Argyrios & Tomislav invitation page.
 *
 * Setup (5 minutes):
 *  1. Create a Google Sheet — this is your guest database.
 *  2. In the Sheet: Extensions → Apps Script. Delete the placeholder code and
 *     paste this file.
 *  3. Deploy → New deployment → type "Web app".
 *       Execute as:      Me
 *       Who has access:  Anyone
 *  4. Copy the /exec URL and paste it into assets/js/config.js as appsScriptUrl.
 *  5. Optional: put your address in NOTIFY_EMAIL to get a mail per response.
 *
 * Re-deploy with "Manage deployments → edit → New version" after any change.
 */

var SHEET_NAME   = 'RSVP';
var NOTIFY_EMAIL = '';   // e.g. 'argyker@gmail.com' — leave empty for no emails

var COLUMNS = [
  ['submittedAt', 'Timestamp'],
  ['firstName',   'First name'],
  ['lastName',    'Surname'],
  ['attending',   'Attending'],
  ['diet',        'Diet'],
  ['allergies',   'Allergies / notes'],
  ['email',       'Email'],
  ['message',     'Message'],
  ['language',    'Language']
];

function doPost(e) {
  try {
    var data = (e && e.parameter) || {};

    // JSON bodies are accepted too, in case you swap the front end later.
    if (e && e.postData && e.postData.type === 'application/json') {
      data = JSON.parse(e.postData.contents);
    }

    if (!String(data.firstName || '').trim() && !String(data.lastName || '').trim()) {
      return json({ ok: false, error: 'empty submission' });
    }

    var sheet = getSheet();
    var row = COLUMNS.map(function (col) {
      if (col[0] === 'submittedAt') return new Date();
      return String(data[col[0]] || '');
    });
    sheet.appendRow(row);

    notify(data);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/** Lets you open the /exec URL in a browser to check the deployment is alive. */
function doGet() {
  return json({ ok: true, service: 'rsvp' });
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    var headers = COLUMNS.map(function (col) { return col[1]; });
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function notify(data) {
  if (!NOTIFY_EMAIL) return;
  var coming = String(data.attending) === 'Yes';
  var name = (data.firstName || '') + ' ' + (data.lastName || '');
  var body = COLUMNS
    .filter(function (col) { return col[0] !== 'submittedAt'; })
    .map(function (col) { return col[1] + ': ' + (data[col[0]] || '-'); })
    .join('\n');

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: (coming ? '✓ ' : '✗ ') + 'RSVP — ' + name.trim(),
    body: body
  });
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
