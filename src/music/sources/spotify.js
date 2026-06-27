const youtube = require('./youtube');

// Resolves a Spotify URL to a YouTube track without Spotify API credentials.
// Uses the public Spotify oEmbed endpoint to get the track title, then searches YouTube.
async function resolveSpotifyUrl(url) {
  console.log(`[Spotify] Resolviendo URL: ${url}`);
  const oembed = await fetch(
    `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`
  );
  if (!oembed.ok) throw new Error(`Spotify oEmbed HTTP ${oembed.status}`);
  const data = await oembed.json();

  console.log(`[Spotify] Título obtenido via oEmbed: "${data.title}"`);
  const track = await youtube.search(data.title);
  if (!track) throw new Error(`No se encontró en YouTube: ${data.title}`);
  console.log(`[Spotify] Resuelto a YouTube: "${track.title}"`);
  return track;
}

module.exports = { resolveSpotifyUrl };
