# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the bot

```
node app.js
```

Requires a `.env` file with at minimum `DISCORD_TOKEN` set. For Navidrome support also set `NAVIDROME_URL`, `NAVIDROME_USER`, and `NAVIDROME_PASS`. The bot fails fast on startup if required vars are missing.

For music commands (`g!play`, etc.) to work, **Message Content Intent** must be enabled in the Discord Developer Portal under Bot → Privileged Gateway Intents.

No build step. No test suite.

## Architecture

The bot is split into `src/` modules. `app.js` is a slim entry point that loads env vars and calls `src/bot.js`.

### Module map

```
src/
  bot.js                    ← Discord client setup + event registration
  config.js                 ← PREFIX, channel IDs, per-user greeting config
  events/
    ready.js                ← logs bot online
    voiceStateUpdate.js     ← TTS greeting when known users join the target voice channel
    messageCreate.js        ← parses g! prefix and dispatches to command handlers
  commands/
    index.js                ← Collection registry (maps name + aliases → command modules)
    play.js / skip.js / stop.js / pause.js / resume.js / queue.js / nowplaying.js / help.js
  music/
    GuildMusicManager.js    ← per-guild queue + AudioPlayer + VoiceConnection
    sources/
      youtube.js            ← play-dl search + getInfo
      spotify.js            ← Spotify oEmbed → YouTube search (no Spotify API creds needed)
      navidrome.js          ← Subsonic API: token auth + search + stream URL
```

### Music flow

`g!play <input>` → `commands/play.js` detects source → resolves to a `track` object → `GuildMusicManager.add(track, voiceChannel)` → `_playNext()` builds an `AudioResource` and plays it. On `Idle`, auto-advances queue or disconnects if alone and empty.

**Source detection in `commands/play.js`:**
- `nav:<query>` → Navidrome search
- `spotify.com` URL → `spotify.js` resolves title via oEmbed → YouTube search
- YouTube URL → `youtube.getInfo()`
- Anything else → `youtube.search()`

**Track object shape:** `{ title, url?, navSongId?, duration, source, thumbnail? }`
- YouTube/Spotify tracks use `url` (YouTube URL)
- Navidrome tracks use `navSongId`; the stream URL is built on demand via `buildStreamUrl(navSongId)` to keep auth tokens fresh

### Navidrome authentication

Uses the Subsonic API token method: for each request, a fresh `salt` is generated and `token = MD5(NAVIDROME_PASS + salt)`. Only the hash is sent over the network — the plaintext password stays in memory. Implemented in `src/music/sources/navidrome.js:buildAuthParams()`.

### Greeting system

`voiceStateUpdate.js` has its own independent connection (`greetingConnection`) separate from the music manager. If the music manager has an active track (`currentTrack !== null`), greetings are silently skipped to avoid interrupting playback. The greeting fires 1 second after the user joins to avoid race conditions.

### Commands (prefix `g!`)

`g!play` `g!skip`/`g!s` `g!stop` `g!pause` `g!resume`/`g!r` `g!queue`/`g!q` `g!np` `g!help`/`g!h`

Adding a new command: create `src/commands/yourcommand.js` exporting `{ name, aliases, description, execute(message, args) }`, then add `require('./yourcommand')` to `src/commands/index.js`.
