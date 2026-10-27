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

import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import DialpadIcon from "@mui/icons-material/Dialpad";
import CommonPage from "@layout/pages/CommonPage";
import QrScanner from "@view/scanner/panel/qrScanner";
import PinEntry from "@view/scanner/panel/pinEntry";

export default function Scanner() {
  return (
    <CommonPage
      title="Scanner"
      icon={<QrCodeScannerIcon />}
      commonPageTabs={[
        {
          tabTitle: "Scan QR Code",
          tabPath: "scan-qr",
          icon: <QrCodeScannerIcon />,
          page: <QrScanner />,
        },
        {
          tabTitle: "Enter PIN",
          tabPath: "enter-pin",
          icon: <DialpadIcon />,
          page: <PinEntry />,
        },
      ]}
    />
  );
}
