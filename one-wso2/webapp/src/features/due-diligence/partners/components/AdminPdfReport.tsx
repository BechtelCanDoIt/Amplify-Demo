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

// Ported from the source app's Resellers/ResellerDashboard/AdminPDFReport.js
// — the downloadable due-diligence PDF. The credit-score arithmetic is NOT
// re-derived here: it reuses creditScoreMath.ts (the same module the Credit
// Score tab renders from), so the two can never disagree.
import { Document, Page, Text, View, Font, StyleSheet } from "@react-pdf/renderer";
import type { PartnerInfoData } from "../api/partnerTypes";
import type { QuestionCategory, QuestionInfo, SubQuestionInfo, PartnerAnswer, FinanceComment } from "../api/financeTypes";
import type { LegalQuestion, LegalSubQuestion, LegalAnswer, LegalComment } from "../api/legalTypes";
import type { ApprovalSummary } from "../api/usePartners";
import type { CreditScoreRatio } from "@features/due-diligence/preferences/api/usePreferences";
import type { YearData } from "./creditScoreMath";
import {
  calculateCurrentRatio,
  calculateCashRatio,
  calculateWorkingCapitalRatio,
  calculateDebtRatio,
  getRevenue,
  getProfit,
  calculateRevenueGrowth,
  calculateCurrentAssetYoY,
  calculateCurrentLiabilityYoY,
  getRatio,
  getFinancialCreditScore,
  calculateTotalCreditScore,
  calculateFinalTotalCreditScore,
  calculateCreditRating,
  calculateFinalCreditRating,
  convertToDollars,
} from "./creditScoreMath";

// Helvetica is one of the 14 standard PDF fonts — pre-loaded by
// @react-pdf/renderer with no Font.register() call and no embedded font
// bytes at all (every PDF reader already has it), so this needs no font
// file and no font license of any kind, unlike shipping Inter or Roboto
// would. fontWeight: 700 below automatically resolves to Helvetica-Bold.
Font.registerHyphenationCallback((word) => [word]);

const fmt = (n: number | string): string => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

function statusColor(status: string | null | undefined): string {
  if (!status) return "#E07030";
  const s = status.toLowerCase();
  if (s === "approved" || s === "active") return "#2E7D32";
  if (s === "rejected" || s === "inactive") return "#C62828";
  return "#E07030";
}

function normalizeStatus(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const s = raw.toString().trim().toLowerCase();
  if (s === "1" || s === "true" || s === "approved") return "Approved";
  if (s === "0" || s === "false" || s === "rejected") return "Rejected";
  if (s === "requested" || s === "pending") return "Pending";
  const trimmed = raw.toString().trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

const NAVY = "#1C3453";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", paddingTop: 55, paddingBottom: 50, paddingHorizontal: 40, fontSize: 9, color: "#333" },
  sectionHeader: { backgroundColor: NAVY, padding: 8, marginBottom: 8, marginTop: 12 },
  sectionHeaderText: { color: "#fff", fontWeight: 700, fontSize: 11 },
  subSectionHeader: { fontWeight: 700, fontSize: 10, borderBottomWidth: 1, borderBottomColor: "#333", paddingBottom: 3, marginTop: 10, marginBottom: 6 },
  subSubSectionHeader: { fontWeight: 700, fontSize: 9, marginTop: 8, marginBottom: 4 },
  dataRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#E8E8E8", paddingVertical: 4 },
  dataLabel: { width: "35%", fontWeight: 700, paddingRight: 4 },
  dataValue: { width: "65%" },
  tableHeader: { flexDirection: "row", backgroundColor: NAVY, padding: 4 },
  tableHeaderCell: { color: "#fff", fontWeight: 700, fontSize: 8 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#dddddd", paddingVertical: 3, paddingHorizontal: 4 },
  tableCell: { fontSize: 8 },
  commentCard: { borderWidth: 0.5, borderColor: "#e0e0e0", padding: 8, marginBottom: 6 },
  commentUser: { fontWeight: 700, color: NAVY, marginBottom: 3 },
  commentText: { fontSize: 8, color: "#444" },
});

function PageHeader({ companyName, reportDate }: { companyName: string; reportDate: string }) {
  return (
    <View fixed style={{ position: "absolute", top: 15, left: 40, right: 40 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingBottom: 6 }}>
        <Text style={{ fontWeight: 700, fontSize: 11, color: NAVY }}>{companyName}</Text>
        <Text style={{ fontSize: 9, color: "#555" }}>Due Diligence Report — {reportDate}</Text>
      </View>
      <View style={{ borderBottomWidth: 0.5, borderBottomColor: "#888" }} />
    </View>
  );
}

function PageFooter() {
  return (
    <View fixed style={{ position: "absolute", bottom: 15, left: 40, right: 40 }}>
      <View style={{ borderTopWidth: 0.5, borderTopColor: "#aaa", paddingTop: 4, flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 8, color: "#555" }}>WSO2 Due Diligence Report — Confidential</Text>
        <Text style={{ fontSize: 8, color: "#555" }} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </View>
  );
}

const SectionHeader = ({ children }: { children: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionHeaderText}>{children}</Text>
  </View>
);
const SubSectionHeader = ({ children }: { children: string }) => <Text style={styles.subSectionHeader}>{children}</Text>;
const SubSubSectionHeader = ({ children }: { children: string }) => <Text style={styles.subSubSectionHeader}>{children}</Text>;

const DataRow = ({ label, value }: { label: string; value?: string | null }) => (
  <View style={styles.dataRow}>
    <Text style={styles.dataLabel}>{label}</Text>
    <Text style={styles.dataValue}>{value || "—"}</Text>
  </View>
);

const CommentCard = ({ item }: { item: { userName?: string; userEmail?: string; comment: string } }) => (
  <View style={styles.commentCard}>
    <Text style={styles.commentUser}>{item.userName ?? item.userEmail ?? ""}</Text>
    <Text style={styles.commentText}>{item.comment}</Text>
  </View>
);

function Section1CompanyProfile({ companyData }: { companyData: PartnerInfoData }) {
  const {
    companyName, taxIdNumber, country, state, cityProvince, streetAddress, postalZipCode,
    yearOfIncorporation, noOfEmployees, noOfCustomers, websiteLink,
    applicantName, applicantDesignation, applicantEmail,
    signatoryName, signatoryDesignation, signatoryEmail,
  } = companyData;

  return (
    <View>
      <SectionHeader>1. Company Profile</SectionHeader>
      <DataRow label="Company Name" value={companyName} />
      <DataRow label="Tax ID Number" value={taxIdNumber} />
      <DataRow label="Country" value={country} />
      <DataRow label="State" value={state} />
      <DataRow label="City / Province" value={cityProvince} />
      <DataRow label="Street Address" value={streetAddress} />
      <DataRow label="Postal / ZIP Code" value={postalZipCode} />
      <DataRow label="Year of Incorporation" value={yearOfIncorporation} />
      <DataRow label="No. of Employees" value={noOfEmployees} />
      <DataRow label="No. of Customers" value={noOfCustomers} />
      <DataRow label="Website" value={websiteLink} />
      <SubSectionHeader>Applicant Details</SubSectionHeader>
      <DataRow label="Name" value={applicantName} />
      <DataRow label="Designation" value={applicantDesignation} />
      <DataRow label="Email" value={applicantEmail} />
      <SubSectionHeader>Signatory Details</SubSectionHeader>
      <DataRow label="Name" value={signatoryName} />
      <DataRow label="Designation" value={signatoryDesignation} />
      <DataRow label="Email" value={signatoryEmail} />
    </View>
  );
}

function answerText(a: PartnerAnswer | undefined): string {
  if (!a) return "—";
  return a.descriptionAnswer || String(a.booleanAnswer ?? "") || "—";
}

function FinancialInformation({
  financeQuestions,
  financeSubQuestions,
  financeAnswers,
}: {
  financeQuestions: QuestionInfo[];
  financeSubQuestions: SubQuestionInfo[];
  financeAnswers: PartnerAnswer[];
}) {
  const getAnsBySubQId = (subQId: number) => answerText(financeAnswers.find((a) => a.subQuestionId === subQId));
  const currencyAnswer = getAnsBySubQId(10);
  const scaleAnswer = getAnsBySubQId(11);
  const isTradeRef = financeAnswers.some((a) => a.questionId === 18);

  if (isTradeRef) {
    const q18 = financeQuestions.find((q) => q.questionId === 18);
    const q19 = financeQuestions.find((q) => q.questionId === 19);
    const subQs18 = financeSubQuestions.filter((sq) => sq.questionId === 18 && !sq.answerTypeFileUpload).sort((a, b) => a.subQuestionId - b.subQuestionId);
    const subQs19 = financeSubQuestions.filter((sq) => sq.questionId === 19 && !sq.answerTypeFileUpload).sort((a, b) => a.subQuestionId - b.subQuestionId);
    const getAns = (subQId: number) => answerText(financeAnswers.find((a) => a.subQuestionId === subQId));

    return (
      <View>
        <SubSectionHeader>2.1 Financial Information</SubSectionHeader>
        <SubSubSectionHeader>2.1.1 Select your Currency</SubSubSectionHeader>
        <DataRow label="Currency" value={currencyAnswer} />
        <SubSubSectionHeader>2.1.2 Select your Scale</SubSubSectionHeader>
        <DataRow label="Scale" value={scaleAnswer} />
        <Text style={{ color: "#555", fontSize: 8, marginTop: 6, marginBottom: 4 }}>
          Note: This company submitted trade reference details as financial information.
        </Text>
        {q18 && <Text style={{ color: "#555", fontSize: 8, marginBottom: 6 }}>{q18.questionHeading}</Text>}
        <SubSubSectionHeader>2.1.3 Reference Company 1</SubSubSectionHeader>
        {subQs18.map((sq) => (
          <DataRow key={sq.subQuestionId} label={sq.description} value={getAns(sq.subQuestionId)} />
        ))}
        {q19 && (
          <>
            <SubSubSectionHeader>2.1.4 Reference Company 2</SubSubSectionHeader>
            {subQs19.map((sq) => (
              <DataRow key={sq.subQuestionId} label={sq.description} value={getAns(sq.subQuestionId)} />
            ))}
          </>
        )}
      </View>
    );
  }

  const q17 = financeQuestions.find((q) => q.questionId === 17);
  return (
    <View>
      <SubSectionHeader>2.1 Financial Information</SubSectionHeader>
      <SubSubSectionHeader>2.1.1 Select your Currency</SubSubSectionHeader>
      <DataRow label="Currency" value={currencyAnswer} />
      <SubSubSectionHeader>2.1.2 Select your Scale</SubSubSectionHeader>
      <DataRow label="Scale" value={scaleAnswer} />
      {q17 && (
        <>
          {q17.questionHeading && <Text style={{ fontWeight: 700, fontSize: 9, marginTop: 6, marginBottom: 4 }}>{q17.questionHeading}</Text>}
          <Text style={{ fontSize: 9, marginBottom: 4, color: "#555" }}>{q17.questionDescription}</Text>
        </>
      )}
      <Text style={{ color: "#888", fontSize: 8, marginTop: 4 }}>Note: File submissions are excluded from this report.</Text>
    </View>
  );
}

function PublicInformation({
  financeCategories,
  financeQuestions,
  financeSubQuestions,
  financeAnswers,
}: {
  financeCategories: QuestionCategory[];
  financeQuestions: QuestionInfo[];
  financeSubQuestions: SubQuestionInfo[];
  financeAnswers: PartnerAnswer[];
}) {
  const publicCat = financeCategories.find((c) => c.categoryName?.toLowerCase().includes("public"));
  if (!publicCat) return null;
  const publicQs = financeQuestions.filter((q) => q.categoryId === publicCat.categoryId).sort((a, b) => a.sortIndex - b.sortIndex);
  if (publicQs.length === 0) return null;

  const getTextAnswer = (questionId: number) => {
    const sqs = financeSubQuestions.filter((sq) => sq.questionId === questionId);
    for (const sq of sqs) {
      const ans = financeAnswers.find((a) => a.subQuestionId === sq.subQuestionId);
      if (ans?.descriptionAnswer) return ans.descriptionAnswer;
    }
    return "—";
  };

  return (
    <View>
      <SubSectionHeader>2.2 Public Information</SubSectionHeader>
      {publicQs.map((q, idx) => (
        <View key={q.questionId} style={{ marginBottom: 6 }}>
          <SubSubSectionHeader>{`2.2.${idx + 1} ${q.questionDescription}`}</SubSubSectionHeader>
          <Text style={{ fontSize: 9, color: "#444" }}>{getTextAnswer(q.questionId)}</Text>
        </View>
      ))}
    </View>
  );
}

interface CreditScoreReportData {
  year1?: YearData;
  year2?: YearData;
  year3?: YearData;
  ratios: CreditScoreRatio[];
  currency: string;
}

const CS_COL = { ratio: "32%", fin: "8%", score: "8%", final: "12%" };

const CsRow = ({
  label, fin1, fin2, fin3, sc1, sc2, sc3, fsc, bold,
}: {
  label: string; fin1?: string; fin2?: string; fin3?: string; sc1?: string | number; sc2?: string | number; sc3?: string | number; fsc?: string | number; bold?: boolean;
}) => (
  <View style={styles.tableRow}>
    <Text style={[styles.tableCell, { width: CS_COL.ratio, fontWeight: bold ? 700 : 400 }]}>{label}</Text>
    <Text style={[styles.tableCell, { width: CS_COL.fin, textAlign: "right", fontWeight: bold ? 700 : 400 }]}>{fin1 ?? ""}</Text>
    <Text style={[styles.tableCell, { width: CS_COL.fin, textAlign: "right", fontWeight: bold ? 700 : 400 }]}>{fin2 ?? ""}</Text>
    <Text style={[styles.tableCell, { width: CS_COL.fin, textAlign: "right", fontWeight: bold ? 700 : 400 }]}>{fin3 ?? ""}</Text>
    <Text style={[styles.tableCell, { width: CS_COL.score, textAlign: "right", fontWeight: bold ? 700 : 400 }]}>{sc1 ?? ""}</Text>
    <Text style={[styles.tableCell, { width: CS_COL.score, textAlign: "right", fontWeight: bold ? 700 : 400 }]}>{sc2 ?? ""}</Text>
    <Text style={[styles.tableCell, { width: CS_COL.score, textAlign: "right", fontWeight: bold ? 700 : 400 }]}>{sc3 ?? ""}</Text>
    <Text style={[styles.tableCell, { width: CS_COL.final, textAlign: "right", fontWeight: bold ? 700 : 400 }]}>{fsc ?? ""}</Text>
  </View>
);

const WRow = ({
  label, curr, yearBefore, priorYear, current, usd: usdCol,
}: {
  label: string; curr: string; yearBefore: number | ""; priorYear: number | ""; current: number | ""; usd?: boolean;
}) => (
  <View style={styles.tableRow}>
    <Text style={[styles.tableCell, { width: "30%" }]}>{label}</Text>
    <Text style={[styles.tableCell, { width: "15%", textAlign: "center" }]}>{curr}</Text>
    <Text style={[styles.tableCell, { width: "18%", textAlign: "right" }]}>{yearBefore !== "" ? (usdCol ? `$ ${fmt(yearBefore)}` : fmt(yearBefore)) : ""}</Text>
    <Text style={[styles.tableCell, { width: "18%", textAlign: "right" }]}>{priorYear !== "" ? (usdCol ? `$ ${fmt(priorYear)}` : fmt(priorYear)) : ""}</Text>
    <Text style={[styles.tableCell, { width: "19%", textAlign: "right" }]}>{current !== "" ? (usdCol ? `$ ${fmt(current)}` : fmt(current)) : ""}</Text>
  </View>
);

function CreditScoreSection({ creditScoreData }: { creditScoreData: CreditScoreReportData }) {
  const { year1, year2, year3, ratios, currency } = creditScoreData;
  if (ratios.length === 0) return null;

  const hasAllYears = Boolean(year1 && year2 && year3 && Object.keys(year1).length && Object.keys(year2).length && Object.keys(year3).length);

  const usd = currency === "US Dollar";
  const norm = (y?: YearData): YearData => {
    if (!y || Object.keys(y).length === 0) return {};
    return usd ? { ...y, exchangeRate: 1 } : y;
  };
  const y1d = Object.keys(norm(year1)).length ? convertToDollars(norm(year1)) : {};
  const y2d = Object.keys(norm(year2)).length ? convertToDollars(norm(year2)) : {};
  const y3d = Object.keys(norm(year3)).length ? convertToDollars(norm(year3)) : {};
  const years: Record<1 | 2 | 3, YearData> = { 1: y1d, 2: y2d, 3: y3d };

  const totalScore = (yearNum: 1 | 2 | 3) => calculateTotalCreditScore(ratios, years, yearNum);
  const finalTotal = calculateFinalTotalCreditScore(ratios, years);
  const creditRating = (yearNum: 1 | 2 | 3) => calculateCreditRating(ratios, years, yearNum);
  const finalRating = calculateFinalCreditRating(ratios, years);

  const workingsRows: { key: keyof YearData; label: string }[] = [
    { key: "currentAssets", label: "Current Assets" },
    { key: "currentLiability", label: "Current Liability" },
    { key: "cash", label: "Cash" },
    { key: "investments", label: "Investments" },
    { key: "totalDebt", label: "Total Debt" },
    { key: "totalAssets", label: "Total Assets" },
    { key: "revenue", label: "Revenue" },
    { key: "profit", label: "Profit" },
  ];
  const getVal = (yearObj: YearData | undefined, key: keyof YearData): number | "" =>
    yearObj && yearObj[key] !== undefined ? parseFloat(String(yearObj[key])) : "";

  return (
    <View>
      <SubSectionHeader>2.3 Credit Score</SubSectionHeader>
      {hasAllYears && (
        <View>
          <SubSubSectionHeader>2.3.1 Credit Score Checking</SubSubSectionHeader>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: CS_COL.ratio }]}>Ratios</Text>
            <Text style={[styles.tableHeaderCell, { width: "24%", textAlign: "center" }]}>Customer Financials</Text>
            <Text style={[styles.tableHeaderCell, { width: "24%", textAlign: "center" }]}>Credit Score</Text>
            <Text style={[styles.tableHeaderCell, { width: CS_COL.final, textAlign: "center" }]}>Financial Credit Score</Text>
          </View>
          <View style={[styles.tableRow, { backgroundColor: "#2a4a70", paddingVertical: 2 }]}>
            <Text style={[styles.tableHeaderCell, { width: CS_COL.ratio }]} />
            <Text style={[styles.tableHeaderCell, { width: CS_COL.fin, textAlign: "right" }]}>N-2</Text>
            <Text style={[styles.tableHeaderCell, { width: CS_COL.fin, textAlign: "right" }]}>N-1</Text>
            <Text style={[styles.tableHeaderCell, { width: CS_COL.fin, textAlign: "right" }]}>N</Text>
            <Text style={[styles.tableHeaderCell, { width: CS_COL.score, textAlign: "right" }]}>N-2</Text>
            <Text style={[styles.tableHeaderCell, { width: CS_COL.score, textAlign: "right" }]}>N-1</Text>
            <Text style={[styles.tableHeaderCell, { width: CS_COL.score, textAlign: "right" }]}>N</Text>
            <Text style={[styles.tableHeaderCell, { width: CS_COL.final, textAlign: "right" }]} />
          </View>
          <CsRow label="Current ratio = Current Assets / Current Liability" fin1={fmt(calculateCurrentRatio(years, 1))} fin2={fmt(calculateCurrentRatio(years, 2))} fin3={fmt(calculateCurrentRatio(years, 3))} sc1={getRatio(ratios, years, "Current ratio", 1)} sc2={getRatio(ratios, years, "Current ratio", 2)} sc3={getRatio(ratios, years, "Current ratio", 3)} fsc={getFinancialCreditScore(ratios, years, "Current ratio")} />
          <CsRow label="Cash ratio = (Cash + Investments) / Current Liability" fin1={fmt(calculateCashRatio(years, 1))} fin2={fmt(calculateCashRatio(years, 2))} fin3={fmt(calculateCashRatio(years, 3))} sc1={getRatio(ratios, years, "Cash ratio", 1)} sc2={getRatio(ratios, years, "Cash ratio", 2)} sc3={getRatio(ratios, years, "Cash ratio", 3)} fsc={getFinancialCreditScore(ratios, years, "Cash ratio")} />
          <CsRow label="Working capital ratio = Current assets - Current liability" fin1={fmt(calculateWorkingCapitalRatio(years, 1))} fin2={fmt(calculateWorkingCapitalRatio(years, 2))} fin3={fmt(calculateWorkingCapitalRatio(years, 3))} sc1={getRatio(ratios, years, "WC", 1)} sc2={getRatio(ratios, years, "WC", 2)} sc3={getRatio(ratios, years, "WC", 3)} fsc={getFinancialCreditScore(ratios, years, "WC")} />
          <CsRow label="Debt ratio = Total debt / Total assets" fin1={fmt(calculateDebtRatio(years, 1))} fin2={fmt(calculateDebtRatio(years, 2))} fin3={fmt(calculateDebtRatio(years, 3))} sc1={getRatio(ratios, years, "Debt ratio", 1)} sc2={getRatio(ratios, years, "Debt ratio", 2)} sc3={getRatio(ratios, years, "Debt ratio", 3)} fsc={getFinancialCreditScore(ratios, years, "Debt ratio")} />
          <CsRow label="Revenue" fin1={fmt(getRevenue(years, 1))} fin2={fmt(getRevenue(years, 2))} fin3={fmt(getRevenue(years, 3))} sc1={getRatio(ratios, years, "Revenue", 1)} sc2={getRatio(ratios, years, "Revenue", 2)} sc3={getRatio(ratios, years, "Revenue", 3)} fsc={getFinancialCreditScore(ratios, years, "Revenue")} />
          <CsRow label="Revenue growth %" fin1={years[1].revenue ? "0.00%" : ""} fin2={`${fmt(calculateRevenueGrowth(years, 2))}%`} fin3={`${fmt(calculateRevenueGrowth(years, 3))}%`} sc1="0" sc2={getRatio(ratios, years, "Revenue growth", 2)} sc3={getRatio(ratios, years, "Revenue growth", 3)} fsc={getFinancialCreditScore(ratios, years, "Revenue growth")} />
          <CsRow label="Profit" fin1={fmt(getProfit(years, 1))} fin2={fmt(getProfit(years, 2))} fin3={fmt(getProfit(years, 3))} />
          <CsRow label="Current Asset YoY %" fin2={`${fmt(calculateCurrentAssetYoY(years, 2))}%`} fin3={`${fmt(calculateCurrentAssetYoY(years, 3))}%`} />
          <CsRow label="Current Liability YoY %" fin2={`${fmt(calculateCurrentLiabilityYoY(years, 2))}%`} fin3={`${fmt(calculateCurrentLiabilityYoY(years, 3))}%`} />
          <View style={[styles.tableRow, { paddingVertical: 4 }]}>
            <Text style={{ width: "100%" }} />
          </View>
          <CsRow bold label="Total Credit Score" sc1={totalScore(1)} sc2={totalScore(2)} sc3={totalScore(3)} fsc={finalTotal} />
          <CsRow bold label="Credit Rating" sc1={creditRating(1)} sc2={creditRating(2)} sc3={creditRating(3)} fsc={finalRating} />
        </View>
      )}

      <View style={{ marginTop: 10 }}>
        <SubSubSectionHeader>{`2.3.2 Workings for Ratios (${currency || ""})`}</SubSubSectionHeader>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: "30%" }]}>Items</Text>
          <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>Currency</Text>
          <Text style={[styles.tableHeaderCell, { width: "18%", textAlign: "right" }]}>Year Before (N-2)</Text>
          <Text style={[styles.tableHeaderCell, { width: "18%", textAlign: "right" }]}>Prior Year (N-1)</Text>
          <Text style={[styles.tableHeaderCell, { width: "19%", textAlign: "right" }]}>Current (N)</Text>
        </View>
        {workingsRows.map((row) => (
          <WRow key={row.key} label={row.label} curr={currency} yearBefore={getVal(year1, row.key)} priorYear={getVal(year2, row.key)} current={getVal(year3, row.key)} />
        ))}
        {currency !== "US Dollar" && (
          <WRow label="Exchange Rate" curr="" yearBefore={getVal(year1, "exchangeRate")} priorYear={getVal(year2, "exchangeRate")} current={getVal(year3, "exchangeRate")} />
        )}
      </View>

      {currency !== "US Dollar" && (
        <View style={{ marginTop: 10 }}>
          <SubSubSectionHeader>2.3.2 Workings for Ratios (US Dollar)</SubSubSectionHeader>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "30%" }]}>Items</Text>
            <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>Currency</Text>
            <Text style={[styles.tableHeaderCell, { width: "18%", textAlign: "right" }]}>Year Before (N-2)</Text>
            <Text style={[styles.tableHeaderCell, { width: "18%", textAlign: "right" }]}>Prior Year (N-1)</Text>
            <Text style={[styles.tableHeaderCell, { width: "19%", textAlign: "right" }]}>Current (N)</Text>
          </View>
          {workingsRows.map((row) => (
            <WRow key={row.key} label={row.label} curr="USD" yearBefore={getVal(y1d, row.key)} priorYear={getVal(y2d, row.key)} current={getVal(y3d, row.key)} usd />
          ))}
        </View>
      )}
    </View>
  );
}

function FinanceOpinion({
  financeComments,
  approvalData,
  financeAnswers,
}: {
  financeComments: FinanceComment[];
  approvalData: Partial<ApprovalSummary>;
  financeAnswers: PartnerAnswer[];
}) {
  const { financeResult, financeSpecialApproval } = approvalData;
  const creatorComments = financeComments.filter((c) => c.questionId === 42);
  const reviewerComments = financeComments.filter((c) => c.questionId === 43);
  const hasSpecialApproverRequest = Boolean(financeSpecialApproval);
  const specialApproverStatus = normalizeStatus(financeSpecialApproval) ?? "Pending";
  const specialApproverComment = financeAnswers
    .filter((a) => a.questionId === 79 && a.subQuestionId !== 98)
    .map((a) => a.descriptionAnswer?.trim())
    .find((t) => t);

  return (
    <View>
      <SubSectionHeader>2.4 Finance Opinion</SubSectionHeader>
      <SubSubSectionHeader>2.4.1 Creator</SubSubSectionHeader>
      {creatorComments.length > 0 ? (
        creatorComments.map((item) => <CommentCard key={item.commentId} item={item} />)
      ) : (
        <Text style={{ fontSize: 8, color: "#888", marginBottom: 4 }}>No creator opinion submitted.</Text>
      )}
      <SubSubSectionHeader>2.4.2 Reviewer</SubSubSectionHeader>
      {reviewerComments.length > 0 ? (
        reviewerComments.map((item) => <CommentCard key={item.commentId} item={item} />)
      ) : (
        <Text style={{ fontSize: 8, color: "#888", marginBottom: 4 }}>No reviewer opinion submitted.</Text>
      )}
      <SubSubSectionHeader>2.4.3 Approver</SubSubSectionHeader>
      {financeResult ? (
        <View>
          <Text style={{ fontSize: 9, fontWeight: 700, color: statusColor(normalizeStatus(financeResult)) }}>{normalizeStatus(financeResult)}</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 8, color: "#888" }}>Pending</Text>
      )}
      {hasSpecialApproverRequest && (
        <View>
          <SubSubSectionHeader>2.4.4 Special Approver</SubSubSectionHeader>
          <Text style={{ fontSize: 9, fontWeight: 700, color: statusColor(specialApproverStatus) }}>{specialApproverStatus}</Text>
          {specialApproverComment && <Text style={{ fontSize: 8, color: "#444", marginTop: 3 }}>{specialApproverComment}</Text>}
        </View>
      )}
      <Text style={{ fontSize: 7, color: "#888", marginTop: 6 }}>* File attachments are excluded from this report.</Text>
    </View>
  );
}

function Section3Legal({
  legalQuestions,
  legalSubQuestions,
  legalAnswers,
  legalComments,
  approvalData,
}: {
  legalQuestions: LegalQuestion[];
  legalSubQuestions: LegalSubQuestion[];
  legalAnswers: LegalAnswer[];
  legalComments: LegalComment[];
  approvalData: Partial<ApprovalSummary>;
}) {
  const { legalResult } = approvalData;
  const legalInfoQuestions = legalQuestions.filter((q) => q.categoryId === 2).sort((a, b) => a.sortIndex - b.sortIndex);

  const getSubQAnswer = (sq: LegalSubQuestion): string => {
    const ans = legalAnswers.find((a) => a.subQuestionId === sq.subQuestionId);
    if (!ans) return "—";
    if (sq.answerType) return ans.booleanAnswer ? ans.descriptionAnswer || "Yes" : "No";
    return ans.descriptionAnswer || "—";
  };

  return (
    <View>
      <SectionHeader>3. Legal</SectionHeader>
      <SubSectionHeader>3.1 Legal Information</SubSectionHeader>
      {legalInfoQuestions.map((q) => {
        const subQs = legalSubQuestions.filter((sq) => sq.questionId === q.questionId && !sq.answerFileUpload).sort((a, b) => a.subQuestionId - b.subQuestionId);
        return (
          <View key={q.questionId} style={{ marginBottom: 8 }}>
            <Text style={{ fontWeight: 700, fontSize: 9, marginBottom: 3 }}>{q.questionDescription}</Text>
            {subQs.map((sq) => (
              <View key={sq.subQuestionId} style={{ flexDirection: "row", marginLeft: 12, marginBottom: 3 }}>
                <Text style={{ width: "45%", color: "#666", fontSize: 8 }}>{sq.description}</Text>
                <Text style={{ width: "55%", fontSize: 8, color: "#333" }}>{getSubQAnswer(sq)}</Text>
              </View>
            ))}
          </View>
        );
      })}
      <SubSectionHeader>3.2 Legal Opinion</SubSectionHeader>
      <SubSubSectionHeader>3.2.1 Legal Comments</SubSubSectionHeader>
      {legalComments.length > 0 ? (
        legalComments.map((item) => <CommentCard key={item.commentId} item={item} />)
      ) : (
        <Text style={{ fontSize: 8, color: "#888", marginBottom: 4 }}>No legal comments submitted.</Text>
      )}
      <Text style={{ fontSize: 7, color: "#888", marginTop: 4, marginBottom: 6 }}>* File attachments are excluded from this report.</Text>
      <SubSubSectionHeader>3.2.2 Legal Approval</SubSubSectionHeader>
      {legalResult ? (
        <Text style={{ fontSize: 9, fontWeight: 700, color: statusColor(normalizeStatus(legalResult)) }}>{normalizeStatus(legalResult)}</Text>
      ) : (
        <Text style={{ fontSize: 8, color: "#888" }}>Pending</Text>
      )}
    </View>
  );
}

function Section4ApprovalSummary({ approvalData }: { approvalData: Partial<ApprovalSummary> & { resellerStatus?: string } }) {
  const { financeResult, financeSpecialApproval, legalResult, resellerStatus } = approvalData;
  const hasSpecialApproverRequest = Boolean(financeSpecialApproval);
  const specialApprovalStatus = normalizeStatus(financeSpecialApproval) ?? "Pending";

  return (
    <View>
      <SectionHeader>4. Approval Summary</SectionHeader>
      <View style={styles.dataRow}>
        <Text style={styles.dataLabel}>Finance Approval</Text>
        <Text style={[styles.dataValue, { color: statusColor(normalizeStatus(financeResult) ?? "Pending"), fontWeight: 700 }]}>{normalizeStatus(financeResult) ?? "Pending"}</Text>
      </View>
      {hasSpecialApproverRequest && (
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Finance Special Approval</Text>
          <Text style={[styles.dataValue, { color: statusColor(specialApprovalStatus), fontWeight: 700 }]}>{specialApprovalStatus}</Text>
        </View>
      )}
      <View style={styles.dataRow}>
        <Text style={styles.dataLabel}>Legal Approval</Text>
        <Text style={[styles.dataValue, { color: statusColor(normalizeStatus(legalResult) ?? "Pending"), fontWeight: 700 }]}>{normalizeStatus(legalResult) ?? "Pending"}</Text>
      </View>
      <View style={styles.dataRow}>
        <Text style={styles.dataLabel}>Company Status</Text>
        <Text style={[styles.dataValue, { color: statusColor(resellerStatus), fontWeight: 700 }]}>{resellerStatus || "—"}</Text>
      </View>
    </View>
  );
}

export interface AdminPdfReportProps {
  companyData: PartnerInfoData;
  financeCategories: QuestionCategory[];
  financeQuestions: QuestionInfo[];
  financeSubQuestions: SubQuestionInfo[];
  financeAnswers: PartnerAnswer[];
  financeComments: FinanceComment[];
  creditScoreData: CreditScoreReportData;
  legalQuestions: LegalQuestion[];
  legalSubQuestions: LegalSubQuestion[];
  legalAnswers: LegalAnswer[];
  legalComments: LegalComment[];
  approvalData: Partial<ApprovalSummary> & { resellerStatus?: string };
  reportDate: string;
}

export default function AdminPdfReport({
  companyData,
  financeCategories,
  financeQuestions,
  financeSubQuestions,
  financeAnswers,
  financeComments,
  creditScoreData,
  legalQuestions,
  legalSubQuestions,
  legalAnswers,
  legalComments,
  approvalData,
  reportDate,
}: AdminPdfReportProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PageHeader companyName={companyData.companyName ?? ""} reportDate={reportDate} />
        <PageFooter />

        <Section1CompanyProfile companyData={companyData} />

        <View break />
        <SectionHeader>2. Finance</SectionHeader>
        <FinancialInformation financeQuestions={financeQuestions} financeSubQuestions={financeSubQuestions} financeAnswers={financeAnswers} />
        <PublicInformation financeCategories={financeCategories} financeQuestions={financeQuestions} financeSubQuestions={financeSubQuestions} financeAnswers={financeAnswers} />
        <CreditScoreSection creditScoreData={creditScoreData} />
        <FinanceOpinion financeComments={financeComments} approvalData={approvalData} financeAnswers={financeAnswers} />

        <View break />
        <Section3Legal legalQuestions={legalQuestions} legalSubQuestions={legalSubQuestions} legalAnswers={legalAnswers} legalComments={legalComments} approvalData={approvalData} />

        <View break />
        <Section4ApprovalSummary approvalData={approvalData} />
      </Page>
    </Document>
  );
}
