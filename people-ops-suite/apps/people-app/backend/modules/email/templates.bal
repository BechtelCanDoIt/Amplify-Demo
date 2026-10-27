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

# Email template for Asgardeo group assignment failure notifications during employee onboarding.
# Placeholders: APP_NAME, EMPLOYEE_NAME, EMPLOYEE_EMAIL, EMPLOYEE_ID, FAILED_GROUPS, YEAR
public final string groupAssignmentFailureTemplate = string `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>WSO2 <!-- [APP_NAME] --></title>
    <style type="text/css">
      @import url("https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap");
      body {
        margin: 0;
        padding: 0;
        background-color: #f4f4f4;
      }
      table {
        border-collapse: collapse;
      }
      img {
        outline: none;
        text-decoration: none;
        border: 0;
      }
      p {
        margin: 1em 0;
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;">
      <tbody>
        <tr>
          <td align="center" valign="top">

            <!-- HEADER -->
            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="
                max-width:650px;
                background-color:#ff7300;
                background-image:url('https://wso2.cachefly.net/wso2/sites/all/2022-optimized/bg-hr-mailer-new.png');
                background-size:auto;
                background-repeat:no-repeat;
                background-position:top;
              "
            >
              <tbody>
                <tr>
                  <td style="padding:30px 20px;">
                    <a href="https://wso2.com/" style="text-decoration:none;" target="_blank">
                      <img
                        src="https://wso2.cachefly.net/wso2/sites/all/image_resources/logos/WSO2-Logo-White.png"
                        alt="WSO2 Logo"
                        height="40"
                        width="100"
                        style="height:auto; width:150px;"
                      />
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- BODY -->
            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="
                max-width:650px;
                background-color:#ffffff;
                margin:auto;
                box-shadow:0px 0px 26px 0 rgba(0,0,0,0.15);
              "
            >
              <tbody>
                <tr>
                  <td style="padding:30px 40px;">

                    <!-- Alert Banner -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tbody>
                        <tr>
                          <td
                            style="
                              background-color:#fde8e8;
                              border-left:4px solid #d9534f;
                              padding:14px 16px;
                              border-radius:4px;
                            "
                          >
                            <p
                              style="
                                margin:0;
                                font-family:'Roboto', Helvetica, sans-serif;
                                font-size:14px;
                                color:#721c24;
                              "
                            >
                              <strong>Action Required</strong> &mdash;
                              An error occurred while assigning Asgardeo groups to the newly created employee during
                              onboarding. The employee record has been created in the system, but group assignments were
                              unsuccessful. Manual intervention may be required.
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <p
                      style="
                        font-family:'Roboto', Helvetica, sans-serif;
                        font-size:16px;
                        color:#465868;
                        margin-top:24px;
                      "
                    >
                      Hi Admin,<br /><br />
                      The following employee's group assignment has <strong>failed</strong> during onboarding. Please
                      review the details below.
                    </p>

                    <!-- Employee Details Table -->
                    <p
                      style="
                        font-family:'Roboto', Helvetica, sans-serif;
                        font-size:15px;
                        color:#465868;
                        font-weight:bold;
                        margin-bottom:4px;
                        margin-top:20px;
                      "
                    >
                      Employee Details:
                    </p>
                    <table
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                      style="
                        border:1px solid #e0e0e0;
                        border-radius:4px;
                        margin-top:8px;
                      "
                    >
                      <tbody>
                        <tr style="background-color:#f9f9f9;">
                          <td
                            style="
                              padding:10px 16px;
                              font-family:'Roboto', Helvetica, sans-serif;
                              font-size:14px;
                              color:#465868;
                              font-weight:bold;
                              width:40%;
                            "
                          >
                            Name
                          </td>
                          <td
                            style="
                              padding:10px 16px;
                              font-family:'Roboto', Helvetica, sans-serif;
                              font-size:14px;
                              color:#465868;
                            "
                          >
                            <!-- [EMPLOYEE_NAME] -->
                          </td>
                        </tr>
                        <tr>
                          <td
                            style="
                              padding:10px 16px;
                              font-family:'Roboto', Helvetica, sans-serif;
                              font-size:14px;
                              color:#465868;
                              font-weight:bold;
                            "
                          >
                            Email
                          </td>
                          <td
                            style="
                              padding:10px 16px;
                              font-family:'Roboto', Helvetica, sans-serif;
                              font-size:14px;
                              color:#465868;
                            "
                          >
                            <!-- [EMPLOYEE_EMAIL] -->
                          </td>
                        </tr>
                        <tr style="background-color:#f9f9f9;">
                          <td
                            style="
                              padding:10px 16px;
                              font-family:'Roboto', Helvetica, sans-serif;
                              font-size:14px;
                              color:#465868;
                              font-weight:bold;
                            "
                          >
                            Employee ID
                          </td>
                          <td
                            style="
                              padding:10px 16px;
                              font-family:'Roboto', Helvetica, sans-serif;
                              font-size:14px;
                              color:#465868;
                            "
                          >
                            <!-- [EMPLOYEE_ID] -->
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <!-- Failed Groups Table -->
                    <p
                      style="
                        font-family:'Roboto', Helvetica, sans-serif;
                        font-size:15px;
                        color:#465868;
                        font-weight:bold;
                        margin-bottom:4px;
                        margin-top:24px;
                      "
                    >
                      Failed Group Assignments:
                    </p>
                    <table
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                      style="
                        border:1px solid #f5c6cb;
                        border-radius:4px;
                        margin-top:8px;
                      "
                    >
                      <tbody>
                        <tr>
                          <td
                            style="
                              padding:12px 16px;
                              font-family:'Roboto', Helvetica, sans-serif;
                              font-size:14px;
                              color:#d9534f;
                            "
                          >
                            <!-- [FAILED_GROUPS] -->
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <p
                      style="
                        font-family:'Roboto', Helvetica, sans-serif;
                        font-size:14px;
                        color:#465868;
                        margin-top:24px;
                      "
                    >
                      <strong>Action Required:</strong> Please log in to the Asgardeo console and manually assign the
                      employee to the required groups, or contact the system administrator for assistance.
                    </p>

                    <p
                      style="
                        font-family:'Roboto', Helvetica, sans-serif;
                        font-size:14px;
                        color:#465868;
                        margin-top:24px;
                      "
                    >
                      Best regards,<br />
                      <!-- [APP_NAME] --> System
                    </p>

                  </td>
                </tr>
              </tbody>
            </table>

            <!-- FOOTER -->
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:650px; margin:auto;">
              <tbody>
                <tr>
                  <td style="padding:20px 40px; text-align:center;">
                    <p
                      style="
                        font-family:'Roboto', Helvetica, sans-serif;
                        font-size:12px;
                        color:#999999;
                        margin:0;
                      "
                    >
                      &copy; <!-- [YEAR] --> WSO2 LLC. This is an automated notification from the <!-- [APP_NAME] --> System.
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
