import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(pathname) {
  if (!existsSync(pathname)) return;
  const text = readFileSync(pathname, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const key = process.env.INFINISYNAPSE_API_KEY?.trim();
const base = (process.env.INFINISYNAPSE_BASE_URL || "https://app.infinisynapse.com").replace(
  /\/$/,
  "",
);

if (!key) {
  console.error(
    "INFINISYNAPSE_API_KEY is missing. Add it to .env.local (server-only) and rerun.",
  );
  process.exit(1);
}

async function infiniFetch(path) {
  const response = await fetch(`${base}${path}`, {
    headers: {
      Authorization: `Bearer ${key}`,
      "x-lang": "en",
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`${path} returned non-JSON (HTTP ${response.status}).`);
  }
  return { response, body };
}

const ping = await infiniFetch("/api/ai/ping");
if (!ping.response.ok || ping.body?.ok !== true) {
  const code = ping.body?.code;
  if (code === 1101 || code === 1105 || ping.response.status === 401) {
    console.error("InfiniSynapse rejected the API key (invalid or expired).");
    process.exit(1);
  }
  console.error(`GET /api/ai/ping failed (HTTP ${ping.response.status}).`);
  process.exit(1);
}
console.log("GET /api/ai/ping -> ok");

const list = await infiniFetch("/api/ai_task/list?page=1&pageSize=1");
if (!list.response.ok) {
  const code = list.body?.code;
  if (code === 1101 || code === 1105) {
    console.error("InfiniSynapse rejected the API key on GET /api/ai_task/list.");
    process.exit(1);
  }
  console.error(`GET /api/ai_task/list failed (HTTP ${list.response.status}).`);
  process.exit(1);
}
if (list.body?.code && list.body.code !== 200) {
  console.error(`GET /api/ai_task/list envelope code ${list.body.code}.`);
  process.exit(1);
}
console.log("GET /api/ai_task/list -> ok");
console.log("InfiniSynapse integration smoke test passed.");
