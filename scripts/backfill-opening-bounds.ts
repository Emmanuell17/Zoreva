/**
 * Dry-run transform for opening overlap bounds.
 *
 * Reads a JSON array of openings on stdin and writes patches on stdout.
 * It never connects to Firestore and never changes `endAt`.
 *
 *   node --import tsx scripts/backfill-opening-bounds.ts < openings.json
 *   node --import tsx scripts/backfill-opening-bounds.ts --rollback < openings.json
 *
 * Apply the printed patches with the Firebase Admin SDK after the rules
 * deploy, against a backup. Rollback is the `--rollback` list: delete only
 * `startMin` and `endMin`. Leave `endAt`, `date`, `startTime`, and `endTime`.
 * Do not run this against production from the app.
 */
import { boundsPatch, boundsRollback, type OpeningRecord } from "@/lib/shifts/backfill";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

const rollback = process.argv.includes("--rollback");
const raw = (await readStdin()).trim();
const openings = raw ? (JSON.parse(raw) as OpeningRecord[]) : [];
if (!Array.isArray(openings)) {
  throw new Error("Expected a JSON array of openings.");
}

const patches = openings.map((opening, index) =>
  rollback
    ? { index, delete: boundsRollback(opening) }
    : { index, set: boundsPatch(opening) },
);
process.stdout.write(`${JSON.stringify(patches, null, 2)}\n`);
