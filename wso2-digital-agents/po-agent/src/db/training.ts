// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

// Training & Certification corpus storage. Single-row pattern — every sync
// overwrites the previous row (id = 1 always). Drive is the source of truth
// for content history (the training team edits their doc in Drive); the DB
// row is just a cache of the latest derived corpus. To recover from a bad
// sync: delete the row and the next sync will rebuild it. See RUNBOOK.md.

import { getPool } from "./client";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";

export interface TrainingCorpus {
  content: string;
  docCount: number;
  totalBytes: number;
  syncedAt: Date;
}

export async function saveTrainingCorpus(
  content: string,
  docCount: number
): Promise<void> {
  const pool = getPool();
  const totalBytes = Buffer.byteLength(content, "utf8");
  await pool.execute<ResultSetHeader>(
    `INSERT INTO agent_training_corpus (id, content, doc_count, total_bytes, synced_at)
     VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
       content = VALUES(content),
       doc_count = VALUES(doc_count),
       total_bytes = VALUES(total_bytes),
       synced_at = VALUES(synced_at)`,
    [content, docCount, totalBytes]
  );
}

export async function getLatestTrainingCorpus(): Promise<TrainingCorpus | null> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT content, doc_count, total_bytes, synced_at
     FROM agent_training_corpus
     WHERE id = 1`
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    content: r.content,
    docCount: r.doc_count,
    totalBytes: r.total_bytes,
    syncedAt: r.synced_at,
  };
}
