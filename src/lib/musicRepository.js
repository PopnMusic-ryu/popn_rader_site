const fs = require("node:fs");
const path = require("node:path");
const { parseLevelCsv, toNumber } = require("./csvLoader");

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

function toSongSummary(song) {
  const radarImageUrl = song.hasRadarImage
    ? `/media/${song.level}/${encodeURIComponent(song.img)}/radar.png`
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
    hasRadarImage: song.hasRadarImage,
    radarImageUrl,
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
        const radarImagePath = path.join(songDir, "radar.png");
        const radar = safeReadRadarJson(radarJsonPath);
        const hasRadarImage = fs.existsSync(radarImagePath);
        const id = buildSongId(level, record.img);

        songs.push({
          ...record,
          id,
          radar,
          hasRadarImage,
          _searchText: "",
        });
      }
    }

    songs.sort((a, b) => {
      if (a.level !== b.level) {
        return b.level - a.level;
      }
      return a.title.localeCompare(b.title, "ja");
    });

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

    const totalMatched = filtered.length;
    const items = filtered.slice(0, limit).map(toSongSummary);

    return { totalMatched, items };
  }

  getSong(level, img) {
    const id = buildSongId(level, img);
    const song = this.songMap.get(id);
    if (!song) {
      return null;
    }

    return {
      ...toSongSummary(song),
      radar: song.radar,
    };
  }
}

module.exports = {
  MusicRepository,
  buildSongId,
};
