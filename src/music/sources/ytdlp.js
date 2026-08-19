const { spawn } = require('child_process');

// Path to the yt-dlp binary. Override with YTDLP_PATH in .env.
// Linux/Docker: 'yt-dlp' (in PATH after: pip3 install yt-dlp)
// Windows local: set YTDLP_PATH to the full path of yt-dlp.exe
function getBinaryPath() {
  return process.env.YTDLP_PATH || 'yt-dlp';
}

// YouTube player client used to resolve media URLs. Override with YTDLP_PLAYER_CLIENT.
//
// yt-dlp's default clients (web / android_vr / tv) now hand back format URLs that
// YouTube answers with "HTTP Error 403: Forbidden" unless the request carries a PO
// token, so streaming from them fails outright — or gets heavily throttled when it
// does connect. The `android` client still returns directly playable URLs.
function getPlayerClient() {
  return process.env.YTDLP_PLAYER_CLIENT || 'android';
}

// Returns a Node.js Readable stream of the best audio for the given YouTube URL.
// Suitable for passing directly to createAudioResource().
function stream(url) {
  const bin = getBinaryPath();
  const playerClient = getPlayerClient();
  console.log(`[yt-dlp] Iniciando stream para: ${url} (client: ${playerClient})`);

  const args = [
    '--no-playlist',
    '-f', 'bestaudio[ext=webm]/bestaudio/bestaudio*',
    '-o', '-',
    '--quiet',
    '--extractor-args', `youtube:player_client=${playerClient}`,
    '--retries', '3',
    // Use the currently-running Node.js binary as the JS runtime for cipher decryption.
    // process.execPath resolves correctly on Windows, Linux, and Docker without extra config.
    `--js-runtimes`, `node:${process.execPath}`,
  ];

  // Point yt-dlp at the bundled ffmpeg from ffmpeg-static (set in app.js)
  if (process.env.FFMPEG_PATH) {
    args.push('--ffmpeg-location', process.env.FFMPEG_PATH);
  }

  args.push(url);

  const proc = spawn(bin, args);

  proc.on('error', (err) => {
    console.error(`[yt-dlp] Error al iniciar proceso: ${err.message}`);
    if (err.code === 'ENOENT') {
      console.error(`[yt-dlp] Binario no encontrado: "${bin}". Configura YTDLP_PATH en .env`);
    }
  });

  // Warnings are kept (no --no-warnings): when YouTube skips formats or signature
  // extraction fails, the reason only shows up here.
  proc.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) console.error(`[yt-dlp] ${msg}`);
  });

  proc.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[yt-dlp] Proceso terminó con código ${code} para: ${url}`);
    } else {
      console.log(`[yt-dlp] Stream completado para: ${url}`);
    }
  });

  return { stream: proc.stdout, process: proc };
}

module.exports = { stream };
