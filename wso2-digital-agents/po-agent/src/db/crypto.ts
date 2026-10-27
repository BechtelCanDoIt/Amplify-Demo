// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { config } from "../config";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;   // 96-bit IV — recommended for GCM

function getKey(): Buffer {
  const buf = Buffer.from(config.tokenEncryptionKey, "hex");
  if (buf.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return buf;
}

/**
 * Encrypts a plaintext string with AES-256-GCM.
 * Returns a colon-delimited string: `<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a value produced by `encrypt`.
 * Returns null if the value is not in the expected format or decryption fails
 * (e.g. a legacy plaintext value, wrong key, or corrupted data).
 */
export function decrypt(value: string): string | null {
  try {
    const parts = value.split(":");
    if (parts.length !== 3) return null; // legacy plaintext or wrong format
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
