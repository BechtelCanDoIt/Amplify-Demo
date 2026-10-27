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

// Wire types, transcribed field-for-field from the backend's
// modules/types/types.bal (PartnerInfoData, PartnerLinkData).

/** GET /partners → one reseller's company-profile data. */
export interface PartnerInfoData {
  companyId: number;
  companyName: string;
  streetAddress: string;
  taxIdNumber: string;
  state: string;
  cityProvince: string;
  postalZipCode: string;
  country: string;
  formStatus: string;
  financeResult: string;
  legalResult: string;
  linkId: number;
  yearOfIncorporation: string;
  noOfEmployees: string;
  noOfCustomers: string;
  websiteLink: string;
  fileName?: string;
  applicantName: string;
  applicantDesignation: string;
  applicantEmail: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  signatoryEmail?: string;
  sentForApproval?: number | null;
  isTradeReferenceEnabled?: boolean | null;
  signedDocumentUpdatedOn?: string | null;
  legalResultUpdatedOn?: string | null;
  financeResultUpdatedOn?: string | null;
  region?: string | null;
}

/** GET /partners → one invitation link's own data. */
export interface PartnerLinkData {
  emails: string[];
  companyName: string;
  contactName: string;
  status: string;
  isExpiring: string;
  country: string;
  linkId: number;
  encodeString: string;
  region?: string | null;
  channelManagerEmail: string;
  isTradeReferenceEnabled: boolean;
}

export interface PartnerData {
  partnerInfo: PartnerInfoData[];
  partnerLinkInfo: PartnerLinkData[];
}

/** GET /countries → the reference-data table used by the "Request Due Diligence" dialog's country select. */
export interface Country {
  countryId: number;
  countryName: string;
  cpi: string | null;
  iso3Code: string | null;
}

/**
 * One row in the Partners table — a link, joined with its reseller profile
 * when one has been created, or a stand-in built from the link alone when it
 * hasn't (a link with no submitted form yet). Same shape as the `resellerLinks`
 * array Resellers.js builds in getResellers(); kept a plain merge here too
 * rather than asking the backend to join, since a link legitimately has no
 * reseller row until someone starts the form.
 */
export interface PartnerRow extends PartnerLinkData {
  reseller: PartnerInfoData;
}

/**
 * Join links with their reseller profile — a direct port of the `.map`
 * in Resellers.js's getResellers(). A link with no matching reseller row
 * (nobody has started the form yet) gets a stand-in profile with "-"
 * placeholders and formStatus "active" so the row still renders and sorts.
 */
export function joinPartnerLinks(data: PartnerData): PartnerRow[] {
  const { partnerInfo, partnerLinkInfo } = data;
  return partnerLinkInfo.map((link) => {
    const reseller: PartnerInfoData = partnerInfo.find((res) => res.linkId === link.linkId) ?? {
      companyId: 0,
      linkId: link.linkId,
      companyName: link.companyName,
      taxIdNumber: "-",
      streetAddress: "-",
      state: "-",
      cityProvince: "-",
      postalZipCode: "-",
      country: link.country,
      yearOfIncorporation: "-",
      noOfEmployees: "-",
      noOfCustomers: "-",
      websiteLink: "-",
      formStatus: "active",
      financeResult: "pending",
      legalResult: "pending",
      region: link.region || "-",
      applicantName: "-",
      applicantDesignation: "-",
      applicantEmail: "-",
      signedDocumentUpdatedOn: null,
      legalResultUpdatedOn: null,
      financeResultUpdatedOn: null,
    };
    return { ...link, reseller };
  });
}
