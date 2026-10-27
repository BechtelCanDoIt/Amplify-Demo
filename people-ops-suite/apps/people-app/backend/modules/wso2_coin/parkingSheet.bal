// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
import ballerinax/googleapis.sheets as sheets;

import people.database;

# Append a confirmed parking reservation to the Google Sheet.
#
# + reservation - Confirmed parking reservation details
# + return - () on success, error if failed
public isolated function appendParkingReservation(database:ParkingReservationDetails reservation) returns error? {
    // Columns: Booking Date | Employee Email | Vehicle Number | Slot Id | Floor
    string[] row = [
        reservation.bookingDate,
        reservation.employeeEmail,
        reservation.vehicleRegistrationNumber,
        reservation.slotId,
        reservation.floorName
    ];

    sheets:ValueRange|error result = parkingSpreadsheetClient->appendValue(
        parkingSheetConfig.sheetId,
        row,
        <sheets:A1Range>{sheetName: parkingSheetConfig.sheetName}
    );

    if result is error {
        return result;
    }
    return ();
}

