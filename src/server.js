const config = require("./config");
const { createApp } = require("./app");
const { MusicRepository } = require("./lib/musicRepository");

const repository = MusicRepository.loadFromDisk(config.MUSIC_ROOT);

const app = createApp({
  repository,
  musicRoot: config.MUSIC_ROOT,
  adminMessage: config.ADMIN_MESSAGE,
  contactFormUrl: config.CONTACT_FORM_URL,
  searchLimitDefault: config.SEARCH_LIMIT_DEFAULT,
  searchLimitMax: config.SEARCH_LIMIT_MAX,
});

app.listen(config.PORT, () => {
  console.log(`[server] listening on http://localhost:${config.PORT}`);
  console.log(`[server] loaded songs: ${repository.getSummary().totalSongs}`);
});
