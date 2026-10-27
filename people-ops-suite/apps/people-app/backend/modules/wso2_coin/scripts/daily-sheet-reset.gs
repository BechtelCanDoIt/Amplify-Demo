/**
 * Clears the parking reservation sheet and restores the header row.
 * Intended to run once daily at midnight via a time-driven trigger.
 */
function dailyGridReset() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName("CarParkReservations");

  if (!sheet) {
    throw new Error("Sheet 'CarParkReservations' not found.");
  }

  // Clear all existing row contents.
  sheet.clearContents();

  // Restore headers expected by the backend append flow.
  var headers = [["Booking Date", "Employee Email", "Vehicle No", "Slot ID", "Floor"]];
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers).setFontWeight("bold");
}
