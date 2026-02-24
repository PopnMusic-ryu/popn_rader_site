const path = require("node:path");
const express = require("express");
const compression = require("compression");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");
const INDEX_HTML_PATH = path.join(PUBLIC_DIR, "index.html");

function isValidLevel(value) {
  return Number.isInteger(value) && value >= 1 && value <= 50;
}

function parseLevel(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

function parseLimit(value, fallback, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function createApp({
  repository,
  musicRoot,
  adminMessage,
  contactFormUrl,
  searchLimitDefault,
  searchLimitMax,
}) {
  if (!repository) {
    throw new Error("repository is required");
  }
  if (!musicRoot) {
    throw new Error("musicRoot is required");
  }

  const app = express();
  app.disable("x-powered-by");

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"],
          "script-src": ["'self'"],
          "connect-src": ["'self'"],
          "img-src": ["'self'", "data:"],
          "style-src": ["'self'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
        },
      },
    })
  );
  app.use(compression());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 600,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use(
    "/media",
    express.static(musicRoot, {
      index: false,
      maxAge: "1d",
      fallthrough: true,
    })
  );

  app.use(
    express.static(PUBLIC_DIR, {
      maxAge: "5m",
      extensions: ["html"],
    })
  );

  app.get("/api/meta", (_req, res) => {
    res.json({
      adminMessage,
      contactFormUrl,
      summary: repository.getSummary(),
    });
  });

  app.get("/api/songs", (req, res) => {
    const query = String(req.query.q ?? "").slice(0, 100);
    const levelParam = req.query.level;
    const parsedLevel =
      levelParam === undefined || levelParam === ""
        ? null
        : parseLevel(levelParam);

    if (levelParam !== undefined && levelParam !== "" && !isValidLevel(parsedLevel)) {
      return res.status(400).json({ error: "Invalid level" });
    }

    const limit = parseLimit(req.query.limit, searchLimitDefault, searchLimitMax);

    const result = repository.search({
      query,
      level: parsedLevel,
      limit,
    });

    return res.json({
      totalMatched: result.totalMatched,
      count: result.items.length,
      items: result.items,
    });
  });

  app.get("/api/songs/:level/:img", (req, res) => {
    const level = parseLevel(req.params.level);
    const img = String(req.params.img ?? "");

    if (!isValidLevel(level)) {
      return res.status(400).json({ error: "Invalid level" });
    }
    if (!/^[A-Za-z0-9._-]{1,100}$/.test(img)) {
      return res.status(400).json({ error: "Invalid img parameter" });
    }

    const song = repository.getSong(level, img);
    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }

    return res.json(song);
  });

  app.use((req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.sendFile(INDEX_HTML_PATH);
  });

  app.use((error, req, res, _next) => {
    console.error("[server:error]", error);

    if (req.path.startsWith("/api/")) {
      return res.status(500).json({ error: "Internal server error" });
    }

    return res.status(500).send("Internal server error");
  });

  return app;
}

module.exports = {
  createApp,
};
