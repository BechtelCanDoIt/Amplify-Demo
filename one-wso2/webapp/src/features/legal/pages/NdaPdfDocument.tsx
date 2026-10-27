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

import type { ReactNode } from "react";
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// Helvetica is one of the 14 standard PDF fonts — no file or license needed.
Font.registerHyphenationCallback((word) => [word]);

// ── Entity configurations ────────────────────────────────────────────────────
//
// Each WSO2 entity has a different opening paragraph and governing law clause.
// The rest of the NDA text is identical across all regional templates.
// Text follows WSO2's official regional Mutual NDA templates.

export interface NdaEntityConfig {
  /** Full legal entity name, e.g. "WSO2 (UK) Ltd." */
  entityFull: string;
  /** Incorporation / address description that follows the entity name in para 1. */
  entityDescription: string;
  /** "USA and/or overseas", "UK and/or overseas", etc. */
  jurisdictionPhrase: string;
  /** Complete governing law + dispute resolution paragraph (entity-specific). */
  governingLaw: string;
  /** Name printed under the WSO2 signature column. */
  signatureLabel: string;
  /** Salesforce billing-country values (names and ISO codes) this entity serves. */
  countries: string[];
}

export const NDA_ENTITY_CONFIGS: Record<string, NdaEntityConfig> = {
  "WSO2 LLC — US": {
    entityFull: "WSO2 LLC",
    entityDescription:
      "a Limited Liability Company in Delaware having its principal place of business at WeWork Quarry Oaks II, 10900 Stonelake Blvd, Building 2, Suite 100, Austin TX, 78759",
    jurisdictionPhrase: "USA and/or overseas",
    governingLaw:
      'This Agreement shall be governed by the laws of Texas excluding its conflicts of laws principles. In the event of a dispute between the parties hereto, arising out of or in connection with or with respect to this Agreement or any breach thereof, such dispute shall be determined and settled by arbitration in Houston, Texas, in accordance with the rules of the American Arbitration Association ("AAA"). The award rendered by the arbitrator shall be final and binding on the parties thereto, and judgment may be entered in any court of competent jurisdiction. Nothing in the above provision shall prevent either party from applying to a court of competent jurisdiction for equitable or injunctive relief.',
    signatureLabel: "WSO2 LLC",
    countries: ["US", "USA", "United States", "United States of America"],
  },

  "WSO2 Lanka (Pvt) Ltd — LK": {
    entityFull: "WSO2 Lanka (Private) Limited",
    entityDescription:
      "a company incorporated under the laws of Sri Lanka having its principal place of business at 105, Bauddhaloka Mawatha, Colombo 04",
    jurisdictionPhrase: "Sri Lanka and/or overseas",
    governingLaw:
      "This Agreement is governed by the laws of Sri Lanka. In the event of a dispute between the parties hereto, arising out of or in connection with or with respect to this Agreement or any breach thereof, such dispute shall be determined and settled by arbitration in Colombo, Sri Lanka in accordance with the rules of the Arbitration Act No 11 of 1995. The award rendered by the arbitrator/s shall be final and binding on the parties thereto, and judgment may be entered in any court of competent jurisdiction. Nothing in the above provision shall prevent either party from applying to a court of competent jurisdiction for equitable or injunctive relief.",
    signatureLabel: "WSO2 Lanka (Private) Limited",
    countries: ["LK", "Sri Lanka"],
  },

  "WSO2 India Pvt Ltd — IN": {
    entityFull: "WSO2 India Private Limited",
    entityDescription:
      "a company incorporated under the laws of India having its registered office at WeWork Prestige Central, Ground Floor, 36, Infantry Road, Tasker Town, Shivaji Nagar, Bengaluru, Karnataka \u2013 560001",
    jurisdictionPhrase: "India and/or overseas",
    governingLaw:
      'This Agreement is governed by the laws of India. In the event of a dispute between the parties hereto, arising out of or in connection with or with respect to this Agreement or any breach thereof, such dispute shall be determined and settled by arbitration administered by the Singapore International Arbitration Centre (SIAC), India Office in Mumbai in accordance with the Arbitration Rules of the Singapore International Arbitration Centre Rules ("SIAC Rules") for the time being in force, which rules are deemed to be incorporated by reference in this clause. The seat of the arbitration shall be Mumbai. The arbitral tribunal shall consist of one arbitrator jointly appointed by the Parties. The substantive law governing the arbitration shall be the Indian Arbitration and Conciliation Act, 1996. Nothing in the above provision shall prevent either party from applying to a court of competent jurisdiction for equitable or injunctive relief.',
    signatureLabel: "WSO2 India Private Limited",
    countries: ["IN", "India"],
  },

  "WSO2 (UK) Ltd — UK": {
    entityFull: "WSO2 (UK) Ltd.",
    entityDescription:
      "a company incorporated under the laws of England having its principal place of business at Appledram Barns, Birdham Road, Chichester, West Sussex, PO20 7EQ",
    jurisdictionPhrase: "UK and/or overseas",
    governingLaw:
      'This Agreement shall be governed by English law. In the event of a dispute between the parties hereto, arising out of or in connection with or with respect to this Agreement or any breach thereof, such dispute shall be determined and settled by arbitration in London, United Kingdom, in accordance with the rules of the International Chamber of Commerce ("ICC"). The award rendered by the arbitrator shall be final and binding on the parties thereto, and judgment may be entered in any court of competent jurisdiction. Nothing in the above provision shall prevent either party from applying to a court of competent jurisdiction for equitable or injunctive relief.',
    signatureLabel: "WSO2 (UK) Ltd.",
    countries: ["GB", "UK", "United Kingdom", "Great Britain", "England", "Scotland", "Wales", "Northern Ireland"],
  },

  "WSO2 Australia Pty Ltd — AU": {
    entityFull: "WSO2 Australia Pty Ltd.",
    entityDescription:
      "a company incorporated under the laws of New South Wales having ABN 90 623 311 348 and its registered office at Level 18, 420 George Street, Sydney NSW 2000, Australia",
    jurisdictionPhrase: "Australia and/or overseas",
    governingLaw:
      'This Agreement shall be governed by the laws of the State of New South Wales, Australia. In the event of a dispute between the parties hereto, arising out of or in connection with or with respect to this Agreement or any breach thereof, such dispute shall be resolved by arbitration in the Australian Disputes Centre ("ADC") in Sydney, New South Wales, in accordance with the Conciliation Rules. The award rendered by the arbitrator shall be final and binding on the parties thereto, and judgment may be entered in any court of competent jurisdiction. Nothing in the above provision shall prevent either party from applying to a court of competent jurisdiction for equitable or injunctive relief.',
    signatureLabel: "WSO2 Australia Pty Ltd.",
    countries: ["AU", "Australia"],
  },

  "WSO2 Middle East FZ-LLC — AE": {
    entityFull: "WSO2 Middle East FZ-LLC",
    entityDescription:
      "a limited liability company incorporated in the jurisdiction of Dubai Development Authority, Dubai, UAE, currently having Commercial License No 98406",
    jurisdictionPhrase: "UAE and/or overseas",
    governingLaw:
      "This Agreement shall be governed by the laws of the Dubai International Financial Centre (DIFC). Any dispute, difference, controversy or claim arising out of or in connection with this Agreement, including (but not limited to) any question regarding its existence, validity, interpretation, performance, discharge and applicable remedies, shall be subject to the exclusive jurisdiction of the Courts of the DIFC.",
    signatureLabel: "WSO2 Middle East FZ-LLC",
    countries: ["AE", "UAE", "United Arab Emirates"],
  },

  "WSO2EA Ltd — KE": {
    entityFull: "WSO2EA Limited",
    entityDescription:
      "a Private Limited Liability Company in Kenya having its registered address at Riverside Park, Chiromo Road PO Box 10643-00100, Nairobi, Kenya",
    jurisdictionPhrase: "Kenya and/or overseas",
    governingLaw:
      "This Agreement and any dispute or claim arising out of or in connection with it (whether contractual or non-contractual in nature) shall be governed by, and is to be construed in accordance with the laws of Kenya. In the case of any dispute, claim, controversy or disagreement arising out of or in connection with this Agreement, the parties shall first use their best efforts to resolve the dispute by negotiation within a period of fifteen (15) Business Days of such dispute arising. If the dispute is not resolved by negotiation, either party may refer the dispute to arbitration in Kenya in accordance with the Arbitration Act (No. 4 of 1995, Laws of Kenya). The seat of arbitration shall be Nairobi, Kenya, and proceedings shall be conducted in English.",
    signatureLabel: "WSO2EA Limited",
    countries: ["KE", "Kenya"],
  },

  "WSO2 SG Pte Ltd — SG": {
    entityFull: "WSO2 SG Pte Ltd",
    entityDescription:
      "a Limited Liability Company in Singapore having its principal place of business at 160 Robinson Road, #14-04 Singapore Business Federation Center, Singapore 068914",
    jurisdictionPhrase: "Singapore and/or overseas",
    governingLaw:
      'This Agreement shall be governed by the laws of Singapore excluding its conflicts of laws principles. In the event of a dispute between the parties hereto, arising out of or in connection with or with respect to this Agreement or any breach thereof, such dispute shall be determined and settled by arbitration in Singapore, in accordance with the rules of the Singapore International Arbitration Centre ("SIAC"). The award rendered by the arbitrator shall be final and binding on the parties thereto, and judgment may be entered in any court of competent jurisdiction. Nothing in the above provision shall prevent either party from applying to a court of competent jurisdiction for equitable or injunctive relief.',
    signatureLabel: "WSO2 SG Pte Ltd",
    countries: ["SG", "Singapore"],
  },

  "WSO2 South Africa Pty Ltd — ZA": {
    entityFull: "WSO2 South Africa Pty Limited",
    entityDescription:
      "a company incorporated in accordance with the laws of the Republic of South Africa, with its registered address at 5 Mareshah 9 Deane Crescent, Northmead, Benoni, Gauteng, 1501",
    jurisdictionPhrase: "South Africa and/or overseas",
    governingLaw:
      "This Agreement shall be governed by and construed in accordance with the laws of the Republic of South Africa and the Parties hereby submit to the non-exclusive jurisdiction of the High Court of South Africa (Gauteng Local Division, Johannesburg), to settle any disputes in connection with the Agreement.",
    signatureLabel: "WSO2 South Africa Pty Limited",
    countries: ["ZA", "South Africa"],
  },

  "WSO2 Spain SL — ES": {
    entityFull: "WSO2 Spain SL",
    entityDescription:
      "fiscal code No. B75474494 having its registered office in Calle Julian Romea 11, 1st floor, apt. 1, 28003 Madrid",
    jurisdictionPhrase: "Spain and/or overseas",
    governingLaw:
      'This Agreement shall be governed by the laws of Spain. In the event of a dispute between the parties hereto, arising out of or in connection with or with respect to this Agreement or any breach thereof, such dispute shall be determined and settled by arbitration in Madrid, Spain, in accordance with the rules of the International Chamber of Commerce ("ICC"). The award rendered by the arbitrator shall be final and binding on the parties thereto, and judgment may be entered in any court of competent jurisdiction. Nothing in the above provision shall prevent either party from applying to a court of competent jurisdiction for equitable or injunctive relief.',
    signatureLabel: "WSO2 Spain SL",
    countries: ["ES", "Spain"],
  },

  "WSO2 Brasil — BR": {
    entityFull: "WSO2 BRASIL TECNOLOGIA E SOFTWARE EIRELI",
    entityDescription:
      "a corporation incorporated under the laws of Brazil and enrolled with the National Corporate Taxpayers' Registry (CNPJ/MF) under the number 24.325.269/0001-06, having its principal place of business at Rua Gomes De Carvalho, N. 1507, Bloco A, Andar 4 Sxx, Vila Ol\u00edmpia, Zip Code 04.547-005, in the city of S\u00e3o Paulo, state of S\u00e3o Paulo, Brazil",
    jurisdictionPhrase: "Brazil and/or overseas",
    governingLaw:
      'This Agreement is governed by the laws of Brazil. In the event of a dispute between the parties hereto, arising out of or in connection with or with respect to this Agreement or any breach thereof, such dispute shall be determined and settled by arbitration in Sao Paulo, Brazil in accordance with the rules of the International Chamber of Commerce ("ICC"). The award rendered by the arbitrator shall be final and binding on the parties thereto, and judgment may be entered in any court of competent jurisdiction. Nothing in the above provision shall prevent either party from applying to a court of competent jurisdiction for equitable or injunctive relief.',
    signatureLabel: "WSO2 BRASIL TECNOLOGIA E SOFTWARE EIRELI",
    countries: ["BR", "Brazil", "Brasil"],
  },
};

/** The NDA_ENTITY_CONFIGS key for a billing country, or "" when no WSO2 entity serves it. */
export function entityForCountry(country: string | null | undefined): string {
  const wanted = country?.trim().toLowerCase();
  if (!wanted) return "";
  const match = Object.entries(NDA_ENTITY_CONFIGS).find(([, cfg]) =>
    cfg.countries.some((c) => c.toLowerCase() === wanted),
  );
  return match?.[0] ?? "";
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
    paddingTop: 48,
    paddingBottom: 52,
    paddingHorizontal: 56,
    lineHeight: 1.55,
  },

  // Page header strip
  pageHeader: {
    borderBottom: "1.5pt solid #E07030",
    paddingBottom: 8,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  pageHeaderBrand: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#E07030",
    letterSpacing: 0.5,
  },
  pageHeaderMeta: {
    fontSize: 8,
    color: "#888888",
  },

  // Document title
  docTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 0.3,
  },

  // Body paragraphs
  para: {
    marginBottom: 10,
    textAlign: "justify",
  },

  // Whereas / recitals block
  recital: {
    marginBottom: 8,
    fontFamily: "Helvetica-Oblique",
    textAlign: "justify",
  },

  // "NOW THEREFORE" intro line
  nowTherefore: {
    marginBottom: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "justify",
  },

  // Numbered clause: number hangs in the left padding, body is justified
  clause: {
    paddingLeft: 20,
    marginBottom: 10,
    textAlign: "justify",
  },
  clauseIntro: {
    marginBottom: 6,
  },
  clauseNumber: {
    position: "absolute",
    left: 0,
    top: 0,
  },

  // Numbered sub-clause: (i), (ii), … indented under its clause's text
  subClause: {
    marginLeft: 20,
    paddingLeft: 26,
    marginBottom: 6,
    textAlign: "justify",
  },
  subClauseLast: {
    marginBottom: 10,
  },
  // Clause 8's "8." sits in the main clause-number column
  subClauseClauseNumber: {
    position: "absolute",
    left: -20,
    top: 0,
  },

  // Section divider
  divider: {
    borderBottom: "0.5pt solid #dddddd",
    marginVertical: 12,
  },

  // Notes box
  notesLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginBottom: 4,
    color: "#333333",
  },
  notesBox: {
    backgroundColor: "#f9f9f9",
    border: "0.5pt solid #dddddd",
    borderRadius: 3,
    padding: 8,
    marginBottom: 12,
  },
  notesText: {
    fontSize: 9.5,
    color: "#444444",
    lineHeight: 1.5,
  },

  // Signature block
  witnessLine: {
    fontFamily: "Helvetica-Bold",
    marginTop: 14,
    marginBottom: 14,
    textAlign: "center",
  },
  sigRow: {
    flexDirection: "row",
    marginBottom: 22,
  },
  sigCol: {
    flex: 1,
  },
  sigEntityName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginBottom: 18,
  },
  sigLine: {
    borderBottom: "0.5pt solid #333333",
    marginBottom: 5,
    marginRight: 20,
    height: 14,
  },
  sigLabel: {
    fontSize: 9,
    color: "#555555",
    marginBottom: 10,
  },

  // Page footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#aaaaaa",
    borderTop: "0.5pt solid #eeeeee",
    paddingTop: 5,
  },
});

// ── Numbered clauses ─────────────────────────────────────────────────────────
//
// Numbering follows the official templates: clauses 1.–8., and (i), (ii), …
// sub-clauses under clauses 6, 7 and 8. The number hangs in the left padding so
// wrapped lines align with the text, not the number.
//
// Each clause and sub-clause is unbreakable (wrap={false}); none is longer than
// a page. Otherwise a page break can leave the number on one page while its
// text moves to the next.

/** A main clause. `intro` marks one that introduces a sub-clause list. */
function Clause({ number, intro, children }: { number: string; intro?: boolean; children: ReactNode }) {
  return (
    <View style={[styles.clause, intro ? styles.clauseIntro : {}]} wrap={false}>
      <Text style={styles.clauseNumber}>{number}</Text>
      <Text>{children}</Text>
    </View>
  );
}

/**
 * A sub-clause. `last` ends its clause's list. `clauseNumber` is for clause 8,
 * whose first line is a sub-clause: "8. (i) …".
 */
function SubClause({
  number,
  last,
  clauseNumber,
  children,
}: {
  number: string;
  last?: boolean;
  clauseNumber?: string;
  children: ReactNode;
}) {
  return (
    <View style={[styles.subClause, last ? styles.subClauseLast : {}]} wrap={false}>
      {clauseNumber && <Text style={styles.subClauseClauseNumber}>{clauseNumber}</Text>}
      <Text style={styles.clauseNumber}>{number}</Text>
      <Text>{children}</Text>
    </View>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface NdaPdfProps {
  template: string;
  wso2Company: string;
  customerName: string;
  customerAddress: string;
  /** Date the NDA is generated, shown as the Effective Date. */
  effectiveDate: string;
  notes: string;
  /** Year shown in the page footer. */
  year: number;
}

// ── Document ─────────────────────────────────────────────────────────────────

export default function NdaPdfDocument({
  template,
  wso2Company,
  customerName,
  customerAddress,
  effectiveDate,
  notes,
  year,
}: NdaPdfProps) {
  // No fallback: the entity sets the governing law, so a wrong one must not
  // produce a valid-looking contract.
  const cfg = NDA_ENTITY_CONFIGS[wso2Company];
  if (!cfg) throw new Error(`No NDA entity config for "${wso2Company}"`);

  const addressPhrase = ` having its principal place of business at ${customerAddress || "_____________________"}`;

  const openingParagraph =
    `This Agreement is made and entered into as of ${effectiveDate} ` +
    `("Effective Date") by and between ${cfg.entityFull} ` +
    `${cfg.entityDescription} ` +
    `(hereinafter referred to as "WSO2" and shall include WSO2 and any of its ` +
    `subsidiaries, branches or affiliates in the ${cfg.jurisdictionPhrase}) and ` +
    `${customerName}${addressPhrase} ` +
    `(hereinafter referred to as "COMPANY" shall include Company and any of its ` +
    `subsidiaries, branches or affiliates). WSO2 and the Company are sometimes ` +
    `referred to herein individually as "a Party" and collectively as "the Parties".`;

  return (
    <Document title={`Mutual NDA \u2014 ${customerName}`} author="WSO2">
      <Page size="A4" style={styles.page}>
        {/* ── Page header ── */}
        <View style={styles.pageHeader} fixed>
          <Text style={styles.pageHeaderBrand}>{"WSO2 \u2014 CONFIDENTIAL"}</Text>
          <Text style={styles.pageHeaderMeta}>{template}</Text>
        </View>

        {/* ── Document title ── */}
        <Text style={styles.docTitle}>MUTUAL NON DISCLOSURE AGREEMENT</Text>

        {/* ── Parties paragraph ── */}
        <Text style={styles.para}>{openingParagraph}</Text>

        {/* ── Recitals ── */}
        <Text style={styles.recital}>
          WHEREAS WSO2 and the COMPANY intend to disclose to each other certain
          information in anticipation of, or in furtherance of a commercial
          relationship (Project).
        </Text>

        <Text style={styles.nowTherefore}>
          NOW THEREFORE, IN CONSIDERATION of the intended disclosure of
          information the Parties agree to the following terms and conditions:
        </Text>

        {/* ── Clause 1 — Definition of Confidential Information ── */}
        <Clause number="1.">
          {`"Confidential Information" means: All information which is disclosed by one Party to the other (Disclosing Party) and which is not excluded in terms of Clause 6 below, whether in writing, pictorially, in machine readable form or orally whether of a business, financial or technical nature (including, but without limitation, procedures, ideas, inventions, trade secrets, technical know how, products, designs, software programs, customer lists, reports, records, drawings, sketches, specifications data projects, plans and proposals and other information of a confidential nature and including the terms of this Agreement) whether or not such information is specifically marked or identified as being or is known to be "confidential", and all information and any encrypted data belonging to or originating from each others shareholders and which is disclosed by Disclosing Party to the other (Receiving Party).`}
        </Clause>

        {/* ── Clause 2 — Non-disclosure obligations ── */}
        <Clause number="2.">
          {`During the term of this Agreement it may be necessary for the Parties to disclose Confidential Information to each other. Each Party agrees to keep the other Party's Confidential Information strictly confidential and not to disclose such Confidential Information to any third party other than each Party's officers, agents, representatives, attorneys or accountants, as the case maybe (Authorised Person), provided that only Confidential Information which an Authorised Person has a need to know shall be disclosed to that Authorised Person and then only if the Authorised Person acknowledges this Agreement and agrees to abide by the terms of this Agreement. Each Party agrees not to use the other Party's Confidential Information other than as required for the Project.`}
        </Clause>

        {/* ── Clause 3 — Property / No licence ── */}
        <Clause number="3.">
          {`All Confidential Information furnished hereunder shall remain the property of the Disclosing Party. Neither this Agreement nor the furnishing of any information hereunder shall be construed as granting a license under any invention, patent, trade mark or copyright to manufacture, use or sell the products or data of the Disclosing Party. Each Party agrees that it will not, by virtue of its association with the other Party, acquire any rights in any Confidential Information, goodwill or other asset or property of the Disclosing Party, whether tangible or intangible and whether or not created by the Disclosing Party. If any such rights become vested in the non-disclosing Party by operation of law or otherwise, the Party agrees to assign the same to the Disclosing Party without further consideration immediately upon the Disclosing Party's request.`}
        </Clause>

        {/* ── Clause 4 — No warranty ── */}
        <Clause number="4.">
          No warranty is given as to the accuracy of the Confidential
          Information.
        </Clause>

        {/* ── Clause 5 — Return / Destruction ── */}
        <Clause number="5.">
          {`Upon the request of a Party and/or in the event of the termination of the association between WSO2 and the COMPANY (for any reason whatsoever) each Party agrees to and will ensure that its employees, agents and Authorised Persons will surrender to the other Party all notes, records and documentation that was supplied to that Party by, or was used, created or controlled by that Party during the period of the association between WSO2 and the COMPANY. This includes all material whether in written or machine-readable form. The Receiving Party will destroy or return to the Disclosing Party upon demand any and all materials or information in tangible form entrusted to the Receiving Party for the Project or copies thereof and the Receiving Party will not distribute in whole or in part any such documents, materials or other items without the Disclosing Party's prior written consent.`}
        </Clause>

        {/* ── Clause 6 — Exclusions ── */}
        <Clause number="6." intro>
          {`The Disclosing Party accepts that the confidentiality obligations of the Receiving Party set forth herein do not apply to Confidential Information of the Disclosing Party where such Confidential Information:`}
        </Clause>
        <SubClause number="(i)">
          Was in the public domain at the time of disclosure;
        </SubClause>
        <SubClause number="(ii)">
          {`After such disclosure becomes generally available to third parties by publication or otherwise through no fault of the Receiving Party;`}
        </SubClause>
        <SubClause number="(iii)">
          {`Was in the Recipient's possession before receipt from the Disclosing Party;`}
        </SubClause>
        <SubClause number="(iv)">
          {`Is rightfully received by the Receiving Party from a third party without a duty of confidentiality;`}
        </SubClause>
        <SubClause number="(v)">
          {`Is independently developed by the Receiving Party without using any of the Disclosing Party's Confidential Information;`}
        </SubClause>
        <SubClause number="(vi)">
          {`Is disclosed by the Receiving Party with the prior written consent of the Disclosing Party;`}
        </SubClause>
        <SubClause number="(vii)" last>
          {`Is required to be disclosed pursuant to a valid judicial court order or is required to be disclosed by law or a Competent Authority, but only to the extent of and for the purpose of such order.`}
        </SubClause>

        {/* ── Clause 7 — Breach and remedies ── */}
        <Clause number="7." intro>
          {`In the event of a breach or threatened breach of any portion of this Agreement by a Party (the Breaching Party) and/or any Authorised Person, the Breaching Party, on behalf of itself and any Authorised Person agrees that the remedy at law for such breach shall be inadequate and that, in addition to and not to the exclusion of any other rights and remedies at law or in equity, the non breaching Party shall be entitled to:`}
        </Clause>
        <SubClause number="(i)">
          {`Temporary and/or permanent injunctive relief restraining the Breaching Party and/or any Authorised Person from any activities that might result in or continue a breach of this Agreement and to a decree for specific performance of the provisions of this Agreement, without being required to show actual damage or irreparable harm or to furnish any bond or other security; and`}
        </SubClause>
        <SubClause number="(ii)" last>
          {`Any damages to the non-Breaching Party caused by the Breaching Party and/or any Authorised Person.`}
        </SubClause>

        {/* ── Clause 8 — General: (i) severability, (ii) no binding commercial agreement ── */}
        <SubClause number="(i)" clauseNumber="8.">
          {`If any of the provisions of this Agreement, or any part thereof is construed to be invalid or unenforceable, the same shall not affect the remainder of such provision or provisions, which shall be given full effect. In the event that the courts hold any one or more provisions wholly or partially unenforceable by reason of the scope thereof or otherwise, it is the intention of the Parties hereto that such determination not bar or in any way affect each Party's right to the relief provided for in this Agreement.`}
        </SubClause>
        <SubClause number="(ii)">
          {`Each Party agrees that no contract or agreement providing for a commercial relationship (or any other transaction) between WSO2 and the COMPANY shall be deemed to exist between the Parties unless and until a definitive written agreement has been executed and delivered by both Parties. Unless and until such a definitive written agreement has been executed and delivered by both Parties, neither Party has any legal obligation of any kind with respect to any commercial relationship (or other transaction) by virtue of this Agreement.`}
        </SubClause>

        {/* ── 8(iii) — Term and termination ── */}
        <SubClause number="(iii)">
          {`This Agreement shall be valid for a period of two (2) years from the Effective Date unless extended by the parties in writing. However, either party may terminate this Agreement upon thirty (30) days prior written notice to the other party. Provided however, subject to clause 6 hereof the obligations in this Agreement shall be binding on both parties for a period of five (5) years from the Effective Date except in the case of trade secrets where the confidentiality obligations shall continue so long as it retains commercial value.`}
        </SubClause>

        {/* ── 8(iv) — Governing law (entity-specific) ── */}
        <SubClause number="(iv)">{cfg.governingLaw}</SubClause>

        {/* ── 8(v) — Waiver ── */}
        <SubClause number="(v)">
          {`The waiver by a Party of a breach of any provision of this Agreement shall not be considered to be a continuing waiver and shall not operate or be construed as a waiver of any subsequent breach by the other Party and/or an Authorised Person.`}
        </SubClause>

        {/* ── 8(vi) — Assignment / Successors ── */}
        <SubClause number="(vi)" last>
          {`The rights of the Parties under this Agreement shall inure to the benefit of, and shall be binding upon their successors and assigns.`}
        </SubClause>

        {/* ── Notes (optional) ── */}
        {notes.trim().length > 0 && (
          <View>
            <View style={styles.divider} />
            <Text style={styles.notesLabel}>Additional Notes</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{notes}</Text>
            </View>
          </View>
        )}

        <View style={styles.divider} />

        {/* ── Signature block ── */}
        <Text style={styles.witnessLine}>
          IN WITNESS WHEREOF THE PARTIES HAVE EXECUTED THIS AGREEMENT AS OF THE
          EFFECTIVE DATE.
        </Text>

        <View style={styles.sigRow}>
          {/* WSO2 column */}
          <View style={styles.sigCol}>
            <Text style={styles.sigEntityName}>{cfg.signatureLabel}</Text>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Signature</Text>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Name</Text>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Title</Text>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Date</Text>
          </View>

          {/* Company column */}
          <View style={styles.sigCol}>
            <Text style={styles.sigEntityName}>{customerName}</Text>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Signature</Text>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Name</Text>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Title</Text>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Date</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text>{year}</Text>
        </View>
      </Page>
    </Document>
  );
}
