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

# Email template for visits where the scheduled departure time has passed
# without being marked as complete — reminder that action is required.
# Placeholders: VISIT_ID, VISITOR_NAME, COMPANY, VISIT_DATE,
# TIME_OF_ENTRY, TIME_OF_DEPARTURE, WHOM_THEY_MEET,
# PASS_NUMBER, PURPOSE_OF_VISIT, YEAR
public final string departureOverdueTemplate = string `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>WSO2 Visitor Management</title>
    <style type="text/css">
      @import url("https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap");
      body { margin: 0; padding: 0; background-color: #f4f4f4; }
      table { border-collapse: collapse; }
      img { outline: none; text-decoration: none; border: 0; }
      p { margin: 1em 0; }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;">
      <tbody>
        <tr>
          <td align="center" valign="top">

            <!-- HEADER -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="max-width:650px; background-color:#ff7300; background-image:url('https://wso2.cachefly.net/wso2/sites/all/2022-optimized/bg-hr-mailer-new.png'); background-size:auto; background-repeat:no-repeat; background-position:top;">
              <tbody>
                <tr>
                  <td style="padding:30px 20px;">
                    <a href="https://wso2.com/" style="text-decoration:none;" target="_blank">
                      <img src="https://wso2.cachefly.net/wso2/sites/all/image_resources/logos/WSO2-Logo-White.png"
                        alt="WSO2 Logo" height="40" width="100" style="height:auto; width:150px;" />
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- BODY -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="max-width:650px; background-color:#ffffff; margin:auto; box-shadow:0px 0px 26px 0 rgba(0,0,0,0.15);">
              <tbody>
                <tr>
                  <td style="padding:30px 40px;">

                    <!-- Alert Banner -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tbody>
                        <tr>
                          <td style="background-color:#fde8e8; border-left:4px solid #d9534f; padding:14px 16px; border-radius:4px;">
                            <p style="margin:0; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#721c24;">
                              <strong>Immediate Action Required</strong> &mdash;
                              The scheduled departure time for this visit passed <!-- [DAYS_OVERDUE] --> and it has not been marked as complete. Please complete this visit immediately.
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <p style="font-family:'Roboto', Helvetica, sans-serif; font-size:16px; color:#465868; margin-top:24px;">
                      The following visit has not been completed. Please review the details below and complete it manually.
                    </p>

                    <!-- Visit Details Table -->
                    <table width="100%" cellpadding="0" cellspacing="0"
                      style="border:1px solid #e0e0e0; border-radius:4px; margin-top:16px;">
                      <tbody>
                        <tr style="background-color:#f9f9f9;">
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868; font-weight:bold; width:40%;">Visit ID</td>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868;"><!-- [VISIT_ID] --></td>
                        </tr>
                        <tr>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868; font-weight:bold;">Visitor Name</td>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868;"><!-- [VISITOR_NAME] --></td>
                        </tr>
                        <tr style="background-color:#f9f9f9;">
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868; font-weight:bold;">Company</td>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868;"><!-- [COMPANY] --></td>
                        </tr>
                        <tr>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868; font-weight:bold;">Visit Date</td>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868;"><!-- [VISIT_DATE] --></td>
                        </tr>
                        <tr style="background-color:#f9f9f9;">
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868; font-weight:bold;">Entry Time</td>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868;"><!-- [TIME_OF_ENTRY] --></td>
                        </tr>
                        <tr>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868; font-weight:bold;">Scheduled Departure</td>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868;"><!-- [TIME_OF_DEPARTURE] --></td>
                        </tr>
                        <tr style="background-color:#f9f9f9;">
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868; font-weight:bold;">Whom They Meet</td>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868;"><!-- [WHOM_THEY_MEET] --></td>
                        </tr>
                        <tr>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868; font-weight:bold;">Pass Number</td>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868;"><!-- [PASS_NUMBER] --></td>
                        </tr>
                        <tr style="background-color:#f9f9f9;">
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868; font-weight:bold;">Purpose of Visit</td>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868;"><!-- [PURPOSE_OF_VISIT] --></td>
                        </tr>
                      </tbody>
                    </table>

                  </td>
                </tr>
              </tbody>
            </table>

            <!-- FOOTER -->
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:650px; margin:auto;">
              <tbody>
                <tr>
                  <td style="padding:20px 40px; text-align:center;">
                    <p style="font-family:'Roboto', Helvetica, sans-serif; font-size:12px; color:#999999; margin:0;">
                      &copy; <!-- [YEAR] --> WSO2 LLC. This is an automated notification from the Visitor Management Scheduler.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>

          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`;

# Email template for visits that have been active for more than 2 days
# with no departure recorded — reminder that action is required.
# Placeholders: VISIT_ID, VISITOR_NAME, COMPANY, VISIT_DATE,
# TIME_OF_ENTRY, WHOM_THEY_MEET, PASS_NUMBER,
# PURPOSE_OF_VISIT, DAYS_ACTIVE, YEAR
public final string longRunningVisitTemplate = string `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>WSO2 Visitor Management</title>
    <style type="text/css">
      @import url("https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap");
      body { margin: 0; padding: 0; background-color: #f4f4f4; }
      table { border-collapse: collapse; }
      img { outline: none; text-decoration: none; border: 0; }
      p { margin: 1em 0; }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;">
      <tbody>
        <tr>
          <td align="center" valign="top">

            <!-- HEADER -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="max-width:650px; background-color:#ff7300; background-image:url('https://wso2.cachefly.net/wso2/sites/all/2022-optimized/bg-hr-mailer-new.png'); background-size:auto; background-repeat:no-repeat; background-position:top;">
              <tbody>
                <tr>
                  <td style="padding:30px 20px;">
                    <a href="https://wso2.com/" style="text-decoration:none;" target="_blank">
                      <img src="https://wso2.cachefly.net/wso2/sites/all/image_resources/logos/WSO2-Logo-White.png"
                        alt="WSO2 Logo" height="40" width="100" style="height:auto; width:150px;" />
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- BODY -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="max-width:650px; background-color:#ffffff; margin:auto; box-shadow:0px 0px 26px 0 rgba(0,0,0,0.15);">
              <tbody>
                <tr>
                  <td style="padding:30px 40px;">

                    <!-- Alert Banner -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tbody>
                        <tr>
                          <td style="background-color:#fde8e8; border-left:4px solid #d9534f; padding:14px 16px; border-radius:4px;">
                            <p style="margin:0; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#721c24;">
                              <strong>Immediate Action Required</strong> &mdash;
                              This visit has been active for <!-- [DAYS_ACTIVE] --> with no scheduled departure time. Please review and complete it immediately.
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <p style="font-family:'Roboto', Helvetica, sans-serif; font-size:16px; color:#465868; margin-top:24px;">
                      The following visit has not been completed. Please review the details below and complete it manually.
                    </p>

                    <!-- Visit Details Table -->
                    <table width="100%" cellpadding="0" cellspacing="0"
                      style="border:1px solid #e0e0e0; border-radius:4px; margin-top:16px;">
                      <tbody>
                        <tr style="background-color:#f9f9f9;">
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868; font-weight:bold; width:40%;">Visit ID</td>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868;"><!-- [VISIT_ID] --></td>
                        </tr>
                        <tr>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868; font-weight:bold;">Visitor Name</td>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868;"><!-- [VISITOR_NAME] --></td>
                        </tr>
                        <tr style="background-color:#f9f9f9;">
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868; font-weight:bold;">Company</td>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868;"><!-- [COMPANY] --></td>
                        </tr>
                        <tr>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868; font-weight:bold;">Visit Date</td>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868;"><!-- [VISIT_DATE] --></td>
                        </tr>
                        <tr style="background-color:#f9f9f9;">
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868; font-weight:bold;">Entry Time</td>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868;"><!-- [TIME_OF_ENTRY] --></td>
                        </tr>
                        <tr>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868; font-weight:bold;">Whom They Meet</td>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868;"><!-- [WHOM_THEY_MEET] --></td>
                        </tr>
                        <tr style="background-color:#f9f9f9;">
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868; font-weight:bold;">Pass Number</td>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868;"><!-- [PASS_NUMBER] --></td>
                        </tr>
                        <tr>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868; font-weight:bold;">Purpose of Visit</td>
                          <td style="padding:10px 16px; font-family:'Roboto', Helvetica, sans-serif; font-size:14px; color:#465868;"><!-- [PURPOSE_OF_VISIT] --></td>
                        </tr>
                      </tbody>
                    </table>

                  </td>
                </tr>
              </tbody>
            </table>

            <!-- FOOTER -->
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:650px; margin:auto;">
              <tbody>
                <tr>
                  <td style="padding:20px 40px; text-align:center;">
                    <p style="font-family:'Roboto', Helvetica, sans-serif; font-size:12px; color:#999999; margin:0;">
                      &copy; <!-- [YEAR] --> WSO2 LLC. This is an automated notification from the Visitor Management Scheduler.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>

          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`;
