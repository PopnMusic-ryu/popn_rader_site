const path = require("path");

const DEFAULT_ADMIN_MESSAGE =
  "管理者からのお知らせ: 本サイトは pop'n music 譜面研究用の非公式データビューアです。";
const DEFAULT_CONTACT_FORM_URL = "https://forms.gle/example";

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function sanitizeContactUrl(url) {
  if (typeof url !== "string") {
    return DEFAULT_CONTACT_FORM_URL;
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return DEFAULT_CONTACT_FORM_URL;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch (_error) {
    return DEFAULT_CONTACT_FORM_URL;
  }

  return DEFAULT_CONTACT_FORM_URL;
}

module.exports = {
  PORT: toPositiveInt(process.env.PORT, 3000),
  MUSIC_ROOT: process.env.MUSIC_ROOT
    ? path.resolve(process.env.MUSIC_ROOT)
    : path.resolve(__dirname, "..", "music"),
  ADMIN_MESSAGE:
    typeof process.env.ADMIN_MESSAGE === "string" &&
    process.env.ADMIN_MESSAGE.trim()
      ? process.env.ADMIN_MESSAGE.trim()
      : DEFAULT_ADMIN_MESSAGE,
  CONTACT_FORM_URL: sanitizeContactUrl(process.env.CONTACT_FORM_URL),
  SEARCH_LIMIT_DEFAULT: toPositiveInt(process.env.SEARCH_LIMIT_DEFAULT, 120),
  SEARCH_LIMIT_MAX: toPositiveInt(process.env.SEARCH_LIMIT_MAX, 500),
};
