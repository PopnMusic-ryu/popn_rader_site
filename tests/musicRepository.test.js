const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { MusicRepository } = require("../src/lib/musicRepository");

const fixtureRoot = path.join(__dirname, "fixtures", "music");

test("MusicRepository.loadFromDisk loads song and radar data", () => {
  const repository = MusicRepository.loadFromDisk(fixtureRoot);
  const summary = repository.getSummary();
  assert.equal(summary.totalSongs, 1);

  const song = repository.getSong(49, "toy_contemporary_ex_");
  assert.ok(song);
  assert.equal(song.title, "シュレーディンガーの猫");
  assert.equal(song.genre, "トイコンテンポラリー(EX)");
  assert.equal(song.notes, 1748);
  assert.equal(song.radar.total_notes, 1528);
  assert.equal(song.radar.soflan, 450);
});

test("MusicRepository.search filters by query and level", () => {
  const repository = MusicRepository.loadFromDisk(fixtureRoot);

  const byQuery = repository.search({ query: "シュレーディンガー", limit: 10 });
  assert.equal(byQuery.totalMatched, 1);
  assert.equal(byQuery.items[0].img, "toy_contemporary_ex_");

  const byLevel = repository.search({ level: 49, limit: 10 });
  assert.equal(byLevel.totalMatched, 1);

  const noMatch = repository.search({ query: "存在しない曲", level: 49, limit: 10 });
  assert.equal(noMatch.totalMatched, 0);
  assert.equal(noMatch.items.length, 0);
});
