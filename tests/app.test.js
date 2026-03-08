const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const request = require("supertest");
const { createApp } = require("../src/app");
const { MusicRepository } = require("../src/lib/musicRepository");

const fixtureRoot = path.join(__dirname, "fixtures", "music");

function buildTestApp() {
  const repository = MusicRepository.loadFromDisk(fixtureRoot);
  return createApp({
    repository,
    musicRoot: fixtureRoot,
    adminMessage: "test message",
    contactFormUrl: "https://forms.gle/test",
    searchLimitDefault: 20,
    searchLimitMax: 100,
  });
}

test("GET /api/meta returns admin info", async () => {
  const app = buildTestApp();
  const response = await request(app).get("/api/meta").expect(200);
  assert.equal(response.body.adminMessage, "test message");
  assert.equal(response.body.summary.totalSongs, 1);
});

test("GET /api/songs returns list", async () => {
  const app = buildTestApp();
  const response = await request(app).get("/api/songs?q=猫").expect(200);
  assert.equal(response.body.totalMatched, 1);
  assert.equal(response.body.count, 1);
  assert.equal(response.body.items[0].title, "シュレーディンガーの猫");
});

test("GET /api/songs/:level/:img returns details", async () => {
  const app = buildTestApp();
  const response = await request(app)
    .get("/api/songs/49/toy_contemporary_ex_")
    .expect(200);
  assert.equal(response.body.level, 49);
  assert.equal(response.body.radar.total_chords, 434.5);
});

test("GET /api/songs validates parameters", async () => {
  const app = buildTestApp();
  await request(app).get("/api/songs?level=500").expect(400);
  await request(app).get("/api/songs?rankBy=invalid").expect(400);
  await request(app).get("/api/songs/99/toy_contemporary_ex_").expect(400);
});

test("GET /api/songs supports ranking condition", async () => {
  const app = buildTestApp();
  const response = await request(app).get("/api/songs?rankBy=notes").expect(200);

  assert.equal(response.body.rankBy, "notes");
  assert.equal(response.body.items[0].ranking, 1);
  assert.equal(response.body.items[0].rankBy, "notes");
});
