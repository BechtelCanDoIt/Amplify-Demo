// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

// Google Drive client for PO policy ingestion.
//
// Authenticates as a real wso2.com user via OAuth 2.0 refresh-token flow
// (service accounts don't work here — WSO2's Workspace policy blocks Drive
// sharing with `*.iam.gserviceaccount.com` addresses). The designated user
// authorizes the bot once via the Google OAuth consent flow; the resulting
// refresh token is stored in `HR_POLICY_GOOGLE_OAUTH_REFRESH_TOKEN` and used
// indefinitely (until the user revokes access, changes password, or 6 months
// of non-use). The configured Drive folder must be shared with that user.
//
// Supported formats: Google Docs (exported as text/plain), plain-text files,
// PDF (via pdf-parse), and Word .docx (via mammoth). Old .doc files, Sheets,
// and slides are skipped with a warning. Scanned / image-only PDFs return
// little or no extractable text — a warning is logged when this happens so
// the operator can convert them to text or add OCR in a follow-up.

import axios from "axios";
import { OAuth2Client } from "google-auth-library";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { config } from "../config";

const DRIVE_API = "https://www.googleapis.com/drive/v3";

const MIME_GOOGLE_DOC = "application/vnd.google-apps.document";
const MIME_GOOGLE_FOLDER = "application/vnd.google-apps.folder";
const MIME_TEXT_PLAIN = "text/plain";
const MIME_PDF = "application/pdf";
const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Below this character count, a PDF / DOCX extraction is suspicious enough to
// log a warning. Typically a scan, image-heavy doc, or a parsing failure.
const SUSPICIOUS_TEXT_THRESHOLD = 50;

export interface PolicyDoc {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  content: string;
}

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

// Module-level OAuth client. Lazily initialised so a fresh access token is
// fetched on first use and then cached internally by google-auth-library
// (re-uses until expiry, then transparently refreshes with the refresh token).
let oauth2Client: OAuth2Client | null = null;

function getOAuthClient(): OAuth2Client {
  if (!oauth2Client) {
    oauth2Client = new OAuth2Client(
      config.policy.oauthClientId,
      config.policy.oauthClientSecret,
    );
    oauth2Client.setCredentials({
      refresh_token: config.policy.oauthRefreshToken,
    });
  }
  return oauth2Client;
}

async function getAccessToken(): Promise<string> {
  const { token } = await getOAuthClient().getAccessToken();
  if (!token) throw new Error("Failed to obtain Drive access token");
  return token;
}

// List direct children of the configured folder. Does NOT recurse into subfolders;
// add recursion later if the PO policy structure needs it.
export async function listFolderFiles(folderId: string): Promise<DriveFileMetadata[]> {
  const token = await getAccessToken();
  const files: DriveFileMetadata[] = [];
  let pageToken: string | undefined;

  do {
    const params: Record<string, string> = {
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id,name,mimeType,modifiedTime),nextPageToken",
      pageSize: "100",
    };
    if (pageToken) params.pageToken = pageToken;

    const resp = await axios.get(`${DRIVE_API}/files`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });

    files.push(...(resp.data.files ?? []));
    pageToken = resp.data.nextPageToken;
  } while (pageToken);

  return files;
}

// Fetch text content for a file. Returns null for unsupported MIME types
// (logged at the call site so the operator can see what was skipped).
export async function fetchFileText(file: DriveFileMetadata): Promise<string | null> {
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };

  if (file.mimeType === MIME_GOOGLE_DOC) {
    // Google Doc → export as plain text
    const resp = await axios.get(`${DRIVE_API}/files/${file.id}/export`, {
      params: { mimeType: "text/plain" },
      headers,
      responseType: "text",
      transformResponse: [(d) => d], // disable automatic JSON parsing
    });
    return resp.data as string;
  }

  if (file.mimeType === MIME_TEXT_PLAIN) {
    const resp = await axios.get(`${DRIVE_API}/files/${file.id}`, {
      params: { alt: "media" },
      headers,
      responseType: "text",
      transformResponse: [(d) => d],
    });
    return resp.data as string;
  }

  if (file.mimeType === MIME_PDF) {
    const buf = await fetchBinary(file.id, headers);
    const parser = new PDFParse({ data: buf });
    try {
      const result = await parser.getText();
      warnIfSuspiciouslyShort(file.name, result.text, "PDF");
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (file.mimeType === MIME_DOCX) {
    const buf = await fetchBinary(file.id, headers);
    const result = await mammoth.extractRawText({ buffer: buf });
    warnIfSuspiciouslyShort(file.name, result.value, "DOCX");
    return result.value;
  }

  if (file.mimeType === MIME_GOOGLE_FOLDER) {
    return null; // skip subfolders for now
  }

  return null; // unsupported MIME — caller decides what to log
}

async function fetchBinary(fileId: string, headers: Record<string, string>): Promise<Buffer> {
  const resp = await axios.get(`${DRIVE_API}/files/${fileId}`, {
    params: { alt: "media" },
    headers,
    responseType: "arraybuffer",
  });
  return Buffer.from(resp.data);
}

function warnIfSuspiciouslyShort(name: string, text: string, kind: "PDF" | "DOCX"): void {
  const trimmedLen = text.trim().length;
  if (trimmedLen < SUSPICIOUS_TEXT_THRESHOLD) {
    const hint = kind === "PDF"
      ? "possibly a scanned / image-only PDF (OCR not supported)"
      : "possibly an empty or image-heavy DOCX";
    console.warn(
      `[policy-drive] ${kind} '${name}' extracted only ${trimmedLen} chars —`,
      hint,
    );
  }
}

export async function fetchAllPolicyDocs(folderId: string): Promise<{
  docs: PolicyDoc[];
  skipped: { name: string; mimeType: string }[];
}> {
  const files = await listFolderFiles(folderId);
  const docs: PolicyDoc[] = [];
  const skipped: { name: string; mimeType: string }[] = [];

  for (const file of files) {
    try {
      const content = await fetchFileText(file);
      if (content === null) {
        skipped.push({ name: file.name, mimeType: file.mimeType });
        continue;
      }
      docs.push({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
        content,
      });
    } catch (err: any) {
      console.error(
        "[policy-drive] Failed to fetch file:", file.name,
        "(id:", file.id, ") —", err?.response?.data ?? err?.message
      );
      skipped.push({ name: file.name, mimeType: file.mimeType });
    }
  }

  return { docs, skipped };
}
