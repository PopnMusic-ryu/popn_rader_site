const state = {
  query: "",
  level: "",
  items: [],
  totalMatched: 0,
  activeSongId: null,
};

const dom = {
  queryInput: document.querySelector("#query-input"),
  levelSelect: document.querySelector("#level-select"),
  resultSummary: document.querySelector("#result-summary"),
  songList: document.querySelector("#song-list"),
  emptyState: document.querySelector("#empty-state"),
  adminMessage: document.querySelector("#admin-message"),
  contactLink: document.querySelector("#contact-link"),
  detailModal: document.querySelector("#detail-modal"),
  modalClose: document.querySelector("#modal-close"),
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

function createSongCard(song) {
  const card = document.createElement("li");
  card.className = "song-card";

  const title = document.createElement("h3");
  title.textContent = song.title;

  const meta = document.createElement("p");
  meta.className = "song-meta";
  meta.textContent = `${song.genre} / Lv${song.level} / BPM ${song.bpm} / NOTES ${formatNumber(
    song.notes
  )}`;

  const detailButton = document.createElement("button");
  detailButton.type = "button";
  detailButton.className = "detail-button";
  detailButton.textContent = "詳細を見る";
  detailButton.addEventListener("click", () => {
    void openSongDetail(song.level, song.img);
  });

  card.append(title, meta, detailButton);
  return card;
}

function renderSongs() {
  dom.songList.textContent = "";

  const fragment = document.createDocumentFragment();
  for (const song of state.items) {
    fragment.append(createSongCard(song));
  }
  dom.songList.append(fragment);

  dom.emptyState.hidden = state.items.length !== 0;

  const countText = `${state.totalMatched.toLocaleString(
    "ja-JP"
  )} 件ヒット / ${state.items.length.toLocaleString("ja-JP")} 件表示`;
  dom.resultSummary.textContent = countText;
}

async function fetchMeta() {
  const response = await fetch("/api/meta");
  if (!response.ok) {
    throw new Error("failed to load meta");
  }
  const meta = await response.json();
  dom.adminMessage.textContent = meta.adminMessage ?? "";
  dom.contactLink.href = meta.contactFormUrl ?? "#";
}

async function fetchSongs() {
  const params = new URLSearchParams();
  if (state.query.trim()) {
    params.set("q", state.query.trim());
  }
  if (state.level) {
    params.set("level", state.level);
  }

  const response = await fetch(`/api/songs?${params.toString()}`);
  if (!response.ok) {
    throw new Error("failed to load songs");
  }
  const payload = await response.json();
  state.items = payload.items ?? [];
  state.totalMatched = payload.totalMatched ?? state.items.length;
  renderSongs();
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
  dom.modalRadarImage.src = "";
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

async function openSongDetail(level, img) {
  const songId = `${level}:${img}`;
  state.activeSongId = songId;
  resetModalFields();
  dom.modalTitle.textContent = "読み込み中...";
  dom.radarImageFallback.hidden = true;
  showModal();

  try {
    const response = await fetch(
      `/api/songs/${encodeURIComponent(level)}/${encodeURIComponent(img)}`
    );
    if (!response.ok) {
      dom.modalTitle.textContent = "読み込みエラー";
      return;
    }

    const song = await response.json();
    if (state.activeSongId !== songId) {
      return;
    }

    dom.modalTitle.textContent = `${song.title} の詳細`;
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
    dom.radarSoflan.textContent = formatNumber(radar.soflan);
    dom.radarLongpop.textContent = formatNumber(radar.longpop);

    if (song.radarImageUrl) {
      dom.modalRadarImage.hidden = false;
      dom.modalRadarImage.src = song.radarImageUrl;
    } else {
      dom.modalRadarImage.hidden = true;
      dom.radarImageFallback.hidden = false;
    }
  } catch (error) {
    console.error(error);
    dom.modalTitle.textContent = "読み込みエラー";
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
    dom.modalRadarImage.hidden = true;
    dom.radarImageFallback.hidden = false;
  });
}

async function bootstrap() {
  buildLevelOptions();
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
