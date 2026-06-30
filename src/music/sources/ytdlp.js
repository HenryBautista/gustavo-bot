const { spawn } = require('child_process');

// Path to the yt-dlp binary. Override with YTDLP_PATH in .env.
// Linux/Docker: 'yt-dlp' (in PATH after: pip3 install yt-dlp)
// Windows local: set YTDLP_PATH to the full path of yt-dlp.exe
function getBinaryPath() {
  return process.env.YTDLP_PATH || 'yt-dlp';
}

// Returns a Node.js Readable stream of the best audio for the given YouTube URL.
// Suitable for passing directly to createAudioResource().
function stream(url) {
  const bin = getBinaryPath();
  console.log(`[yt-dlp] Iniciando stream para: ${url}`);

  const args = [
    '--no-playlist',
    '-f', 'bestaudio[ext=webm]/bestaudio/bestaudio*',
    '-o', '-',
    '--quiet',
    '--no-warnings',
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
