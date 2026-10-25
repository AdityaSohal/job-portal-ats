const FORMULA_START = /^[=+\-@\t\r]/;

export const csvCell = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);

  let s = Array.isArray(value) ? value.join("; ") : value instanceof Date ? value.toISOString() : String(value);
  if (FORMULA_START.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (headers, rows) =>
  [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");