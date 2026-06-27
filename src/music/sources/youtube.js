const { spawn } = require('child_process');

function getBin() {
  return process.env.YTDLP_PATH || 'yt-dlp';
}

function getBaseArgs() {
  const args = [
    '--quiet',
    '--no-warnings',
    '--no-playlist',
    '--js-runtimes', `node:${process.execPath}`,
  ];
  if (process.env.FFMPEG_PATH) {
    args.push('--ffmpeg-location', process.env.FFMPEG_PATH);
  }
  return args;
}

const PRINT_TEMPLATE = '%(title)s|||%(webpage_url)s|||%(duration)s|||%(abr)s|||%(thumbnail)s';

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(getBin(), args);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr.trim() || `yt-dlp salió con código ${code}`));
      else resolve(stdout.trim());
    });
  });
}

function parseOutput(line) {
  const [title, url, durationStr, abrStr, thumbnail] = line.split('|||');
  const abr = parseFloat(abrStr);
  return {
    title: title || 'Sin título',
    url,
    duration: parseInt(durationStr) || 0,
    source: 'youtube',
    thumbnail: thumbnail && thumbnail !== 'NA' ? thumbnail : null,
    quality: Number.isFinite(abr) && abr > 0 ? `${Math.round(abr)} kbps` : null,
  };
}

async function search(query) {
  console.log(`[YouTube] Buscando: "${query}"`);
  const output = await runYtDlp([
    `ytsearch1:${query}`,
    '--print', PRINT_TEMPLATE,
    ...getBaseArgs(),
  ]);
  const track = parseOutput(output);
  console.log(`[YouTube] Encontrado: "${track.title}" | Calidad: ${track.quality ?? 'desconocida'}`);
  return track;
}

async function getInfo(url) {
  console.log(`[YouTube] Obteniendo info de URL: ${url}`);
  const output = await runYtDlp([
    url,
    '--print', PRINT_TEMPLATE,
    ...getBaseArgs(),
  ]);
  const track = parseOutput(output);
  console.log(`[YouTube] Info obtenida: "${track.title}" | Calidad: ${track.quality ?? 'desconocida'}`);
  return track;
}

module.exports = { search, getInfo };
