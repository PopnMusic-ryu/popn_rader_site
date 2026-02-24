const fs = require("node:fs");
const { parse } = require("csv-parse/sync");

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

function toInteger(value, fallback = 0) {
  return Math.trunc(toNumber(value, fallback));
}

function normalizeRecord(rawRecord, level) {
  const record = rawRecord ?? {};
  return {
    level,
    ver: String(record.VER ?? "").trim(),
    genre: String(record.GENRE ?? "").trim(),
    title: String(record.TITLE ?? "").trim(),
    img: String(record.IMG ?? "").trim(),
    bpm: String(record.BPM ?? "").trim(),
    len: String(record.LEN ?? "").trim(),
    notes: toInteger(record.NOTES, 0),
  };
}

function parseLevelCsv(csvPath, level) {
  if (!fs.existsSync(csvPath)) {
    return [];
  }

  const rawText = fs.readFileSync(csvPath, "utf8");
  if (!rawText.trim()) {
    return [];
  }

  const rows = parse(rawText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  return rows
    .map((row) => normalizeRecord(row, level))
    .filter((record) => record.img && record.title);
}

module.exports = {
  parseLevelCsv,
  toNumber,
  toInteger,
};
