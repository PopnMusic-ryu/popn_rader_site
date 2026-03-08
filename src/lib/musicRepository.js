const fs = require("node:fs");
const path = require("node:path");
const { parseLevelCsv, toNumber } = require("./csvLoader");
const RANK_BY_VALUES = Object.freeze([
  "notes",
  "chord",
  "peak",
  "longpop",
  "soflan",
]);
const RANK_BY_SET = new Set(RANK_BY_VALUES);
const RANK_BY_TO_RADAR_FIELD = Object.freeze({
  notes: "total_notes",
  chord: "total_chords",
  peak: "max_notes_calc",
  longpop: "longpop",
  soflan: "soflan",
});

function buildSongId(level, img) {
  return `${level}:${img}`;
}

function normalizeRadar(rawRadar) {
  if (!rawRadar || typeof rawRadar !== "object") {
    return null;
  }

  return {
    total_notes: toNumber(rawRadar.total_notes),
    total_chords: toNumber(rawRadar.total_chords),
    max_notes_calc: toNumber(rawRadar.max_notes_calc),
    soflan: toNumber(rawRadar.soflan),
    longpop: toNumber(rawRadar.longpop),
  };
}

function safeReadRadarJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return normalizeRadar(JSON.parse(raw));
  } catch (_error) {
    return null;
  }
}

function createSearchText(song) {
  return [
    song.ver,
    song.genre,
    song.title,
    song.img,
    song.level,
    song.bpm,
    song.len,
    song.notes,
  ]
    .join(" ")
    .toLowerCase();
}

function tokenizeQuery(query) {
  return String(query ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);
}

function isValidRankBy(value) {
  return typeof value === "string" && RANK_BY_SET.has(value);
}

function getRankMetricValue(song, rankBy) {
  if (!song || !song.radar || !isValidRankBy(rankBy)) {
    return null;
  }

  const fieldName = RANK_BY_TO_RADAR_FIELD[rankBy];
  const metric = song.radar[fieldName];
  const numeric = Number(metric);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return numeric;
}

function defaultSongComparator(a, b) {
  if (a.level !== b.level) {
    return b.level - a.level;
  }
  return a.title.localeCompare(b.title, "ja");
}

function rankingComparator(rankBy) {
  return (a, b) => {
    const aValue = getRankMetricValue(a, rankBy);
    const bValue = getRankMetricValue(b, rankBy);
    const aHasValue = aValue !== null;
    const bHasValue = bValue !== null;

    if (aHasValue && bHasValue && aValue !== bValue) {
      return bValue - aValue;
    }
    if (aHasValue !== bHasValue) {
      return aHasValue ? -1 : 1;
    }

    return defaultSongComparator(a, b);
  };
}

function findRadarImageFile(songDir) {
  if (!fs.existsSync(songDir)) {
    return null;
  }

  const preferredNames = [
    "radar.png",
    "radar.jpg",
    "radar.jpeg",
    "radar.webp",
    "radar.gif",
    "radar.avif",
  ];

  for (const name of preferredNames) {
    if (fs.existsSync(path.join(songDir, name))) {
      return name;
    }
  }

  try {
    const files = fs.readdirSync(songDir);
    const matched = files.find((fileName) =>
      /^radar\.(png|jpe?g|webp|gif|avif)$/i.test(fileName)
    );
    return matched ?? null;
  } catch (_error) {
    return null;
  }
}

function toSongSummary(song, options = {}) {
  const radarImageUrl = song.radarImageFileName
    ? `media/${song.level}/${encodeURIComponent(song.img)}/${encodeURIComponent(
        song.radarImageFileName
      )}`
    : null;

  return {
    id: song.id,
    level: song.level,
    ver: song.ver,
    genre: song.genre,
    title: song.title,
    img: song.img,
    bpm: song.bpm,
    len: song.len,
    notes: song.notes,
    hasRadarImage: Boolean(song.radarImageFileName),
    radarImageUrl,
    ranking: Number.isInteger(options.ranking) ? options.ranking : null,
    rankBy: isValidRankBy(options.rankBy) ? options.rankBy : null,
  };
}

function toSongDetail(song) {
  return {
    ...toSongSummary(song),
    radar: song.radar,
  };
}

class MusicRepository {
  constructor(songs) {
    this.songs = songs;
    this.songMap = new Map();

    for (const song of songs) {
      this.songMap.set(song.id, song);
    }
  }

  static loadFromDisk(musicRoot) {
    const songs = [];

    for (let level = 1; level <= 50; level += 1) {
      const levelDir = path.join(musicRoot, String(level));
      if (!fs.existsSync(levelDir)) {
        continue;
      }

      const csvPath = path.join(levelDir, `${level}.csv`);
      const records = parseLevelCsv(csvPath, level);

      for (const record of records) {
        const songDir = path.join(levelDir, record.img);
        const radarJsonPath = path.join(songDir, "detected_results.json");
        const radar = safeReadRadarJson(radarJsonPath);
        const radarImageFileName = findRadarImageFile(songDir);
        const id = buildSongId(level, record.img);

        songs.push({
          ...record,
          id,
          radar,
          radarImageFileName,
          _searchText: "",
        });
      }
    }

    songs.sort(defaultSongComparator);

    for (const song of songs) {
      song._searchText = createSearchText(song);
    }

    return new MusicRepository(songs);
  }

  getSummary() {
    return {
      totalSongs: this.songs.length,
    };
  }

  search(options = {}) {
    const queryTokens = tokenizeQuery(options.query);
    const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : 120;
    const rankBy = isValidRankBy(options.rankBy) ? options.rankBy : null;
    const level =
      Number.isInteger(options.level) && options.level >= 1 && options.level <= 50
        ? options.level
        : null;

    let filtered = this.songs;

    if (level !== null) {
      filtered = filtered.filter((song) => song.level === level);
    }

    if (queryTokens.length > 0) {
      filtered = filtered.filter((song) =>
        queryTokens.every((token) => song._searchText.includes(token))
      );
    }

    if (rankBy) {
      filtered = [...filtered].sort(rankingComparator(rankBy));
    }

    const totalMatched = filtered.length;
    const rankingMap = rankBy
      ? new Map(filtered.map((song, index) => [song.id, index + 1]))
      : null;
    const items = filtered
      .slice(0, limit)
      .map((song) =>
        toSongSummary(song, {
          rankBy,
          ranking: rankingMap ? rankingMap.get(song.id) : null,
        })
      );

    return { totalMatched, items, rankBy };
  }

  getSong(level, img) {
    const id = buildSongId(level, img);
    const song = this.songMap.get(id);
    if (!song) {
      return null;
    }

    return toSongDetail(song);
  }

  getAllSongs() {
    return this.songs.map(toSongDetail);
  }
}

module.exports = {
  MusicRepository,
  buildSongId,
  RANK_BY_VALUES,
  isValidRankBy,
};
