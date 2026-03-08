const fs = require("node:fs");
const path = require("node:path");
const config = require("../src/config");
const { MusicRepository } = require("../src/lib/musicRepository");

const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");
const distDir = path.join(projectRoot, "dist");
const dataDir = path.join(distDir, "data");
const mediaDir = path.join(distDir, "media");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function build() {
  if (!fs.existsSync(publicDir)) {
    throw new Error(`public directory not found: ${publicDir}`);
  }

  fs.rmSync(distDir, { recursive: true, force: true });
  ensureDir(distDir);

  fs.cpSync(publicDir, distDir, { recursive: true });
  ensureDir(dataDir);

  const repository = MusicRepository.loadFromDisk(config.MUSIC_ROOT);
  const songs = repository.getAllSongs();
  const summary = repository.getSummary();

  const meta = {
    adminMessage: config.ADMIN_MESSAGE,
    contactFormUrl: config.CONTACT_FORM_URL,
    summary,
    generatedAt: new Date().toISOString(),
  };

  writeJson(path.join(dataDir, "meta.json"), meta);
  writeJson(path.join(dataDir, "songs.json"), { items: songs });

  if (fs.existsSync(config.MUSIC_ROOT)) {
    fs.cpSync(config.MUSIC_ROOT, mediaDir, { recursive: true });
  }

  const indexPath = path.join(distDir, "index.html");
  const notFoundPath = path.join(distDir, "404.html");
  if (fs.existsSync(indexPath)) {
    fs.copyFileSync(indexPath, notFoundPath);
  }

  fs.writeFileSync(path.join(distDir, ".nojekyll"), "", "utf8");

  console.log("[build:pages] output:", distDir);
  console.log("[build:pages] songs:", summary.totalSongs);
}

build();
