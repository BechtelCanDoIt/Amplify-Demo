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
import ballerina/http;

# Fetch the wallets owned by the calling user.
#
# + userAssertion - End-user assertion to forward to the payment service
# + return - The caller's wallets, or error
public isolated function getUserWallets(string userAssertion) returns WalletDetails[]|error {
    return check transactionClient->/wallets/me.get({[USER_ASSERTION_HEADER]: userAssertion});
}

# Collect a payment from the payer wallet to the master wallet.
#
# + userAssertion - End-user assertion to forward to the payment service
# + fromAddress - Payer wallet address selected by the user
# + amount - Amount to collect in coins
# + reference - Idempotency reference for the payment
# + return - Payment confirmation on success, `PaymentError` on a rejection, or error on transport failure
public isolated function collectPayment(string userAssertion, string fromAddress, decimal amount, string reference)
        returns CollectPaymentResponse|error {

    CollectPaymentRequest payload = {
        fromAddress,
        toAddress: masterWalletAddress,
        amount: amount.toString(),
        reference,
        'source: PARKING_PAYMENT_SOURCE
    };

    http:Response response = check transactionClient->/payments.post(payload, {[USER_ASSERTION_HEADER]: userAssertion});

    int statusCode = response.statusCode;
    if statusCode == http:STATUS_CREATED || statusCode == http:STATUS_OK {
        json body = check response.getJsonPayload();
        return body.cloneWithType(CollectPaymentResponse);
    }

    return error PaymentError(PAYMENT_REJECTED_MESSAGE, statusCode = statusCode, reason = extractReason(response));
}

# Extract a human-readable reason from a payment service error response.
#
# + response - Payment service response
# + return - Reason from the response body, or a generic fallback
isolated function extractReason(http:Response response) returns string {
    json|error body = response.getJsonPayload();
    if body is map<json> {
        json message = body["message"];
        if message is string && message.trim().length() > 0 {
            return message;
        }
    }
    return PAYMENT_REJECTED_MESSAGE;
}
