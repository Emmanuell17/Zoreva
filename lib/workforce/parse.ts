import * as XLSX from "xlsx";

export type WorkforceRow = {
  row: number;
  values: Record<string, string>;
};

export type WorkforceTable = {
  headers: string[];
  rows: WorkforceRow[];
  filename: string;
};

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 2000;

export function isAllowedWorkforceFile(file: { name: string; size: number }): string | null {
  if (file.size <= 0) return "The file is empty.";
  if (file.size > MAX_BYTES) return "Use a CSV or Excel file smaller than 5 MB.";
  const name = file.name.toLowerCase();
  if (!name.endsWith(".csv") && !name.endsWith(".xlsx") && !name.endsWith(".xls")) {
    return "Upload a .csv, .xlsx, or .xls file.";
  }
  return null;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      current.push(field.trim());
      field = "";
      continue;
    }
    if (char === "\n") {
      current.push(field.trim());
      if (current.some((item) => item)) rows.push(current);
      current = [];
      field = "";
      continue;
    }
    if (char !== "\r") field += char;
  }

  current.push(field.trim());
  if (current.some((item) => item)) rows.push(current);
  return rows;
}

function tableFromMatrix(matrix: string[][], filename: string): WorkforceTable {
  if (matrix.length < 2) {
    throw new Error("The file needs a header row and at least one data row.");
  }
  const headers = matrix[0].map((header, index) => normalizeHeader(header) || `column_${index + 1}`);
  const rows: WorkforceRow[] = [];
  for (const [index, cells] of matrix.slice(1, MAX_ROWS + 1).entries()) {
    const values: Record<string, string> = {};
    headers.forEach((header, headerIndex) => {
      values[header] = (cells[headerIndex] ?? "").trim();
    });
    if (Object.values(values).some(Boolean)) {
      rows.push({ row: index + 2, values });
    }
  }
  if (rows.length === 0) {
    throw new Error("The file has no data rows.");
  }
  return { headers, rows, filename };
}

export function parseWorkforceFile(
  bytes: Uint8Array,
  filename: string,
): WorkforceTable {
  const name = filename.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = new TextDecoder("utf-8").decode(bytes);
    return tableFromMatrix(parseCsv(text), filename);
  }

  const workbook = XLSX.read(bytes, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("The spreadsheet has no sheets.");
  }
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });
  return tableFromMatrix(
    matrix.map((row) => row.map((cell) => String(cell ?? "").trim())),
    filename,
  );
}

export function firstValue(row: WorkforceRow, keys: string[]): string {
  for (const key of keys) {
    const value = row.values[key];
    if (value) return value;
  }
  return "";
}
