const path = require("path");

const DEFAULT_ADMIN_MESSAGE =
  "2026/03/17:テスト運用中です。現在レベル50の楽曲のみレーダー化しています。\n"+
  "この曲の値おかしいぞ！！と思ったら気軽にお問い合わせくださいm(_ _)m）";
const DEFAULT_CONTACT_FORM_URL = "https://forms.gle/FCHDyx5wkmjwZ5m48";
const DEFAULT_EXPLAIN_MESSAGE =
  "基本的にIIDXの楽曲レーダーを参考に作成しており、以下の値をもとに各値を計算しています。\n"+
  "NOTES:総ノーツ数\n"+
  "CHORD:同時押し\n"+
  "PEAK:密度\n"+
  "LONGPOP:ロングポップ君\n"+
  "SOF-LAN:速度変化";

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
  EXPLAIN_MESSAGE:
    typeof process.env.EXPLAIN_MESSAGE === "string" &&
    process.env.EXPLAIN_MESSAGE.trim()
      ? process.env.EXPLAIN_MESSAGE.trim()
      : DEFAULT_EXPLAIN_MESSAGE,
  CONTACT_FORM_URL: sanitizeContactUrl(process.env.CONTACT_FORM_URL),
  SEARCH_LIMIT_DEFAULT: toPositiveInt(process.env.SEARCH_LIMIT_DEFAULT, 120),
  SEARCH_LIMIT_MAX: toPositiveInt(process.env.SEARCH_LIMIT_MAX, 500),
};
