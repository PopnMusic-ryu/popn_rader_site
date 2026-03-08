const DEFAULT_LIMIT = 120;

const state = {
  query: "",
  level: "",
  primaryView: "title",
  rankBy: "",
  items: [],
  totalMatched: 0,
  activeSongId: null,
  dataSource: "api",
  staticMeta: null,
  staticSongs: [],
  staticSongMap: new Map(),
};

const dom = {
  searchForm: document.querySelector("#search-form"),
  queryInput: document.querySelector("#query-input"),
  levelSelect: document.querySelector("#level-select"),
  primaryViewSelect: document.querySelector("#primary-view-select"),
  rankBySelect: document.querySelector("#rank-by-select"),
  resultSummary: document.querySelector("#result-summary"),
  songList: document.querySelector("#song-list"),
  emptyState: document.querySelector("#empty-state"),
  adminMessage: document.querySelector("#admin-message"),
  contactLink: document.querySelector("#contact-link"),
  detailModal: document.querySelector("#detail-modal"),
  modalTitle: document.querySelector("#modal-title"),
  modalRadarImage: document.querySelector("#modal-radar-image"),
  radarImageFallback: document.querySelector("#radar-image-fallback"),
  modalSongTitle: document.querySelector("#modal-song-title"),
  modalSongGenre: document.querySelector("#modal-song-genre"),
  modalSongLevel: document.querySelector("#modal-song-level"),
  modalSongBpm: document.querySelector("#modal-song-bpm"),
  modalSongLen: document.querySelector("#modal-song-len"),
  modalSongNotes: document.querySelector("#modal-song-notes"),
  radarTotalNotes: document.querySelector("#radar-total-notes"),
  radarTotalChords: document.querySelector("#radar-total-chords"),
  radarMaxNotes: document.querySelector("#radar-max-notes"),
  radarSoflan: document.querySelector("#radar-soflan"),
  radarLongpop: document.querySelector("#radar-longpop"),
};

const RANK_LABELS = Object.freeze({
  notes: "NOTES",
  chord: "CHORD",
  peak: "PEAK",
  longpop: "LONGPOP",
  soflan: "SOF-LAN",
});

const RANK_TO_RADAR_FIELD = Object.freeze({
  notes: "total_notes",
  chord: "total_chords",
  peak: "max_notes_calc",
  longpop: "longpop",
  soflan: "soflan",
});

function debounce(fn, waitMs) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }
  return Number(value).toLocaleString("ja-JP");
}

function getRankLabel(rankBy) {
  if (!rankBy) {
    return "";
  }
  return RANK_LABELS[rankBy] ?? String(rankBy).toUpperCase();
}

function resolveAssetUrl(url) {
  if (!url) {
    return "";
  }
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:")) {
    return url;
  }
  return new URL(url, window.location.href).toString();
}

function getMainDisplayText(song) {
  if (state.primaryView === "genre") {
    return song.genre || "-";
  }
  return song.title || "-";
}

function getSecondaryDisplayText(song) {
  if (state.primaryView === "genre") {
    return song.title || "-";
  }
  return song.genre || "-";
}

function tokenizeQuery(query) {
  return String(query ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);
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

function getRadarMetricValue(song, rankBy) {
  if (!rankBy || !song || !song.radar) {
    return null;
  }
  const field = RANK_TO_RADAR_FIELD[rankBy];
  if (!field) {
    return null;
  }
  const numeric = Number(song.radar[field]);
  return Number.isFinite(numeric) ? numeric : null;
}

function compareDefault(a, b) {
  if (a.level !== b.level) {
    return b.level - a.level;
  }
  return String(a.title ?? "").localeCompare(String(b.title ?? ""), "ja");
}

function compareByRank(rankBy) {
  return (a, b) => {
    const aValue = getRadarMetricValue(a, rankBy);
    const bValue = getRadarMetricValue(b, rankBy);
    const aHasValue = aValue !== null;
    const bHasValue = bValue !== null;

    if (aHasValue && bHasValue && aValue !== bValue) {
      return bValue - aValue;
    }
    if (aHasValue !== bHasValue) {
      return aHasValue ? -1 : 1;
    }
    return compareDefault(a, b);
  };
}

function toStaticSummary(song, options = {}) {
  return {
    id: song.id ?? `${song.level}:${song.img}`,
    level: song.level,
    ver: song.ver,
    genre: song.genre,
    title: song.title,
    img: song.img,
    bpm: song.bpm,
    len: song.len,
    notes: song.notes,
    hasRadarImage: Boolean(song.radarImageUrl),
    radarImageUrl: song.radarImageUrl ?? null,
    ranking: Number.isInteger(options.ranking) ? options.ranking : null,
    rankBy: options.rankBy || null,
  };
}

function renderSongs() {
  dom.songList.textContent = "";

  const fragment = document.createDocumentFragment();
  for (const song of state.items) {
    const card = document.createElement("li");
    card.className = "song-card";

    const title = document.createElement("h3");
    title.textContent = getMainDisplayText(song);

    const meta = document.createElement("p");
    meta.className = "song-meta";
    meta.textContent = `${getSecondaryDisplayText(song)} / Lv${song.level} / BPM ${
      song.bpm
    } / NOTES ${formatNumber(song.notes)}`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "detail-button";
    button.textContent = "詳細を見る";
    button.addEventListener("click", () => {
      void openSongDetail(song.level, song.img);
    });

    if (Number.isInteger(song.ranking) && song.ranking > 0 && song.rankBy) {
      const rank = document.createElement("p");
      rank.className = "song-rank";
      rank.textContent = `${getRankLabel(song.rankBy)} Rank #${song.ranking}`;
      card.append(title, rank, meta, button);
    } else {
      card.append(title, meta, button);
    }

    fragment.append(card);
  }

  dom.songList.append(fragment);
  dom.emptyState.hidden = state.items.length !== 0;

  const rankingText = state.rankBy
    ? ` / ${getRankLabel(state.rankBy)}ランキング順`
    : "";
  dom.resultSummary.textContent = `${state.totalMatched.toLocaleString(
    "ja-JP"
  )} 件ヒット / ${state.items.length.toLocaleString("ja-JP")} 件表示${rankingText}`;
}

function applyMeta(meta) {
  dom.adminMessage.textContent = meta?.adminMessage ?? "";
  dom.contactLink.href = meta?.contactFormUrl ?? "#";
}

function buildApiSongsUrl() {
  const params = new URLSearchParams();
  if (state.query.trim()) {
    params.set("q", state.query.trim());
  }
  if (state.level) {
    params.set("level", state.level);
  }
  if (state.rankBy) {
    params.set("rankBy", state.rankBy);
  }
  const query = params.toString();
  return query ? `api/songs?${query}` : "api/songs";
}

async function fetchJsonOrThrow(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`request failed: ${url}`);
  }
  return response.json();
}

async function ensureStaticDataLoaded() {
  if (state.staticSongs.length > 0 && state.staticMeta) {
    return;
  }

  const [meta, songsPayload] = await Promise.all([
    fetchJsonOrThrow("data/meta.json"),
    fetchJsonOrThrow("data/songs.json"),
  ]);

  const items = Array.isArray(songsPayload)
    ? songsPayload
    : Array.isArray(songsPayload?.items)
      ? songsPayload.items
      : [];

  state.staticMeta = meta;
  state.staticSongs = items;
  state.staticSongMap = new Map(
    items.map((song) => [`${song.level}:${song.img}`, song])
  );
}

async function switchToStaticMode() {
  await ensureStaticDataLoaded();
  state.dataSource = "static";
}

function runStaticSearch() {
  const tokens = tokenizeQuery(state.query);
  const levelNumber = state.level ? Number.parseInt(state.level, 10) : null;
  const rankBy = state.rankBy || "";

  let filtered = state.staticSongs;

  if (Number.isInteger(levelNumber)) {
    filtered = filtered.filter((song) => Number(song.level) === levelNumber);
  }

  if (tokens.length > 0) {
    filtered = filtered.filter((song) => {
      const searchText = createSearchText(song);
      return tokens.every((token) => searchText.includes(token));
    });
  }

  if (rankBy) {
    filtered = [...filtered].sort(compareByRank(rankBy));
  } else {
    filtered = [...filtered].sort(compareDefault);
  }

  const rankingMap = rankBy
    ? new Map(filtered.map((song, index) => [`${song.level}:${song.img}`, index + 1]))
    : null;

  state.totalMatched = filtered.length;
  state.items = filtered.slice(0, DEFAULT_LIMIT).map((song) =>
    toStaticSummary(song, {
      rankBy: rankBy || null,
      ranking: rankingMap ? rankingMap.get(`${song.level}:${song.img}`) : null,
    })
  );
}

async function fetchMeta() {
  if (state.dataSource === "static") {
    applyMeta(state.staticMeta);
    return;
  }

  try {
    const meta = await fetchJsonOrThrow("api/meta");
    applyMeta(meta);
  } catch (_error) {
    await switchToStaticMode();
    applyMeta(state.staticMeta);
  }
}

async function fetchSongs() {
  if (state.dataSource === "static") {
    runStaticSearch();
    renderSongs();
    return;
  }

  try {
    const payload = await fetchJsonOrThrow(buildApiSongsUrl());
    state.items = payload.items ?? [];
    state.totalMatched = payload.totalMatched ?? state.items.length;
    state.rankBy = payload.rankBy || "";
    renderSongs();
  } catch (_error) {
    await switchToStaticMode();
    runStaticSearch();
    renderSongs();
  }
}

function resetModalFields() {
  dom.modalSongTitle.textContent = "-";
  dom.modalSongGenre.textContent = "-";
  dom.modalSongLevel.textContent = "-";
  dom.modalSongBpm.textContent = "-";
  dom.modalSongLen.textContent = "-";
  dom.modalSongNotes.textContent = "-";
  dom.radarTotalNotes.textContent = "-";
  dom.radarTotalChords.textContent = "-";
  dom.radarMaxNotes.textContent = "-";
  dom.radarSoflan.textContent = "-";
  dom.radarLongpop.textContent = "-";
  dom.modalRadarImage.hidden = false;
  dom.modalRadarImage.removeAttribute("src");
  dom.radarImageFallback.hidden = true;
}

function showModal() {
  dom.detailModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  dom.detailModal.hidden = true;
  state.activeSongId = null;
  document.body.style.overflow = "";
}

function fillModal(song) {
  dom.modalTitle.textContent = `${song.title ?? "-"} の詳細`;
  dom.modalSongTitle.textContent = song.title ?? "-";
  dom.modalSongGenre.textContent = song.genre ?? "-";
  dom.modalSongLevel.textContent = String(song.level ?? "-");
  dom.modalSongBpm.textContent = song.bpm ?? "-";
  dom.modalSongLen.textContent = song.len ?? "-";
  dom.modalSongNotes.textContent = formatNumber(song.notes);

  const radar = song.radar ?? {};
  dom.radarTotalNotes.textContent = formatNumber(radar.total_notes);
  dom.radarTotalChords.textContent = formatNumber(radar.total_chords);
  dom.radarMaxNotes.textContent = formatNumber(radar.max_notes_calc);
  dom.radarLongpop.textContent = formatNumber(radar.longpop);
  dom.radarSoflan.textContent = formatNumber(radar.soflan);

  if (song.radarImageUrl) {
    dom.radarImageFallback.hidden = true;
    dom.modalRadarImage.hidden = false;
    dom.modalRadarImage.src = resolveAssetUrl(song.radarImageUrl);
  } else {
    dom.modalRadarImage.hidden = true;
    dom.radarImageFallback.hidden = false;
  }
}

async function openSongDetail(level, img) {
  const songId = `${level}:${img}`;
  state.activeSongId = songId;
  resetModalFields();
  dom.modalTitle.textContent = "読み込み中...";
  showModal();

  if (state.dataSource === "static") {
    const song = state.staticSongMap.get(songId);
    if (!song) {
      dom.modalTitle.textContent = "読み込みエラー";
      return;
    }
    fillModal(song);
    return;
  }

  try {
    const song = await fetchJsonOrThrow(
      `api/songs/${encodeURIComponent(level)}/${encodeURIComponent(img)}`
    );
    if (state.activeSongId !== songId) {
      return;
    }
    fillModal(song);
  } catch (_error) {
    try {
      await switchToStaticMode();
      const song = state.staticSongMap.get(songId);
      if (!song) {
        dom.modalTitle.textContent = "読み込みエラー";
        return;
      }
      fillModal(song);
    } catch (_staticError) {
      dom.modalTitle.textContent = "読み込みエラー";
    }
  }
}

function buildLevelOptions() {
  const fragment = document.createDocumentFragment();
  for (let level = 1; level <= 50; level += 1) {
    const option = document.createElement("option");
    option.value = String(level);
    option.textContent = String(level);
    fragment.append(option);
  }
  dom.levelSelect.append(fragment);
}

function registerEvents() {
  const debouncedSearch = debounce(() => {
    void fetchSongs().catch((error) => {
      console.error(error);
      dom.resultSummary.textContent = "検索に失敗しました";
    });
  }, 250);

  dom.queryInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    debouncedSearch();
  });

  dom.levelSelect.addEventListener("change", (event) => {
    state.level = event.target.value;
    void fetchSongs().catch((error) => {
      console.error(error);
      dom.resultSummary.textContent = "検索に失敗しました";
    });
  });

  dom.primaryViewSelect.addEventListener("change", (event) => {
    state.primaryView = event.target.value === "genre" ? "genre" : "title";
    renderSongs();
  });

  dom.rankBySelect.addEventListener("change", (event) => {
    state.rankBy = event.target.value;
    void fetchSongs().catch((error) => {
      console.error(error);
      dom.resultSummary.textContent = "検索に失敗しました";
    });
  });

  dom.searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.query = dom.queryInput.value;
    state.level = dom.levelSelect.value;
    state.rankBy = dom.rankBySelect.value;
    void fetchSongs().catch((error) => {
      console.error(error);
      dom.resultSummary.textContent = "検索に失敗しました";
    });
  });

  dom.detailModal.addEventListener("click", (event) => {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.closest('[data-close-modal="true"]')
    ) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dom.detailModal.hidden) {
      closeModal();
    }
  });

  dom.modalRadarImage.addEventListener("error", () => {
    if (!dom.modalRadarImage.getAttribute("src")) {
      return;
    }
    dom.modalRadarImage.hidden = true;
    dom.radarImageFallback.hidden = false;
  });

  dom.modalRadarImage.addEventListener("load", () => {
    dom.modalRadarImage.hidden = false;
    dom.radarImageFallback.hidden = true;
  });
}

async function bootstrap() {
  buildLevelOptions();
  state.primaryView = dom.primaryViewSelect.value === "genre" ? "genre" : "title";
  state.rankBy = dom.rankBySelect.value || "";
  registerEvents();

  try {
    await fetchMeta();
  } catch (error) {
    console.error(error);
    dom.adminMessage.textContent = "メッセージの読み込みに失敗しました";
  }

  try {
    await fetchSongs();
  } catch (error) {
    console.error(error);
    dom.resultSummary.textContent = "楽曲の読み込みに失敗しました";
  }
}

void bootstrap();
