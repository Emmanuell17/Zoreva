type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  mapValue?: { fields?: Record<string, FirestoreValue> };
  arrayValue?: { values?: FirestoreValue[] };
};

export function decodeFirestoreValue(value: FirestoreValue): unknown {
  if (typeof value.stringValue === "string") return value.stringValue;
  if (typeof value.integerValue === "string") return Number(value.integerValue);
  if (typeof value.doubleValue === "number") return value.doubleValue;
  if (typeof value.booleanValue === "boolean") return value.booleanValue;
  if ("nullValue" in value) return null;
  if (value.mapValue?.fields) return decodeFirestoreFields(value.mapValue.fields);
  if (value.arrayValue?.values) return value.arrayValue.values.map(decodeFirestoreValue);
  return null;
}

export function decodeFirestoreFields(
  fields: Record<string, FirestoreValue>,
): Record<string, unknown> {
  const decoded: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    decoded[key] = decodeFirestoreValue(value);
  }
  return decoded;
}

export async function readFirestoreDocument(
  path: string,
  idToken: string,
  projectId: string,
): Promise<Record<string, unknown> | null> {
  const encoded = path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${encoded}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
    cache: "no-store",
  });
  if (response.status === 403 || response.status === 404) return null;
  if (!response.ok) throw new Error("Could not verify company access.");
  const body = (await response.json()) as { fields?: Record<string, FirestoreValue> };
  return body.fields ? decodeFirestoreFields(body.fields) : {};
}
