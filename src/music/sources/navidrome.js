const crypto = require('crypto');

function validateConfig() {
  const { NAVIDROME_URL, NAVIDROME_USER, NAVIDROME_PASS } = process.env;
  if (!NAVIDROME_URL || !NAVIDROME_USER || !NAVIDROME_PASS) {
    throw new Error('Faltan NAVIDROME_URL, NAVIDROME_USER o NAVIDROME_PASS en .env');
  }
  if (!NAVIDROME_URL.startsWith('http://') && !NAVIDROME_URL.startsWith('https://')) {
    throw new Error('NAVIDROME_URL debe empezar con http:// o https://');
  }
}

function buildAuthParams() {
  const salt = crypto.randomBytes(8).toString('hex');
  const token = crypto
    .createHash('md5')
    .update(process.env.NAVIDROME_PASS + salt)
    .digest('hex');
  return new URLSearchParams({
    u: process.env.NAVIDROME_USER,
    t: token,
    s: salt,
    v: '1.16.1',
    c: 'gustavo-bot',
    f: 'json',
  }).toString();
}

async function search(query) {
  validateConfig();
  console.log(`[Navidrome] Buscando: "${query}"`);
  const extra = new URLSearchParams({
    query,
    songCount: '10',
    albumCount: '0',
    artistCount: '0',
  });
  const url = `${process.env.NAVIDROME_URL}/rest/search3.view?${buildAuthParams()}&${extra}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Navidrome search HTTP ${res.status}`);

  const data = await res.json();
  const response = data['subsonic-response'];

  if (response.status !== 'ok') {
    throw new Error(`Navidrome error: ${response.error?.message || 'Desconocido'}`);
  }

  const songs = response.searchResult3?.song ?? [];
  console.log(`[Navidrome] ${songs.length} resultado(s) para: "${query}"`);
  if (songs.length > 0) {
    console.log(`[Navidrome] Primer resultado: "${songs[0].title}" — ${songs[0].artist}`);
  }

  return songs.map((song) => ({
    title: `${song.title} — ${song.artist}`,
    navSongId: song.id,
    duration: song.duration ?? 0,
    source: 'navidrome',
    thumbnail: null,
    quality: song.bitRate ? `${song.bitRate} kbps` : null,
  }));
}

function buildStreamUrl(songId) {
  console.log(`[Navidrome] Construyendo stream URL para songId: ${songId}`);
  const params = new URLSearchParams({ id: String(songId) });
  return `${process.env.NAVIDROME_URL}/rest/stream.view?${buildAuthParams()}&${params}`;
}

module.exports = { search, buildStreamUrl };
