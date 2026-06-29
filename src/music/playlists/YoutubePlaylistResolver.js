const { spawn } = require('child_process');
const BasePlaylistResolver = require('./BasePlaylistResolver');

// Only matches pure playlist URLs, not watch?v=...&list=... (those stay as single tracks)
const PLAYLIST_URL_RE = /youtube\.com\/playlist\?.*list=/;

function getBin() {
  return process.env.YTDLP_PATH || 'yt-dlp';
}

function runFlatPlaylist(url) {
  return new Promise((resolve, reject) => {
    const args = [
      url,
      '--flat-playlist',
      '-J',
      '--quiet',
      '--no-warnings',
    ];
    if (process.env.FFMPEG_PATH) args.push('--ffmpeg-location', process.env.FFMPEG_PATH);

    const proc = spawn(getBin(), args);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr.trim() || `yt-dlp salió con código ${code}`));
      else resolve(JSON.parse(stdout));
    });
  });
}

class YoutubePlaylistResolver extends BasePlaylistResolver {
  canResolve(input) {
    return PLAYLIST_URL_RE.test(input);
  }

  async resolve(url) {
    console.log(`[YTPlaylist] Resolviendo playlist: ${url}`);
    const data = await runFlatPlaylist(url);
    const entries = data.entries ?? [];
    const tracks = entries.map((entry) => ({
      title: entry.title || 'Sin título',
      url: `https://www.youtube.com/watch?v=${entry.id}`,
      duration: entry.duration ?? 0,
      source: 'youtube',
      thumbnail: null,
      quality: null,
    }));
    console.log(`[YTPlaylist] "${data.title}": ${tracks.length} canciones`);
    return { name: data.title || 'Playlist de YouTube', tracks };
  }
}

module.exports = new YoutubePlaylistResolver();
