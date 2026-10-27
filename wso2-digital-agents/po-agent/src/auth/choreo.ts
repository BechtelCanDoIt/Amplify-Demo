// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

// Choreo API Bearer Token
//
// Since Asgardeo is the Choreo key manager, the user's Asgardeo access_token
// is accepted directly by the Choreo API Gateway — no token exchange needed.
// The gateway validates the token against Asgardeo and injects it as
// x-jwt-assertion to the Ballerina backend, which extracts email + groups.

export async function getChoreoUserToken(
  _googleUserId: string,
  accessToken: string
): Promise<string> {
  return accessToken;
}
