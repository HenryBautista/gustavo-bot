require('dotenv').config();

const ffmpegPath = require('ffmpeg-static');
process.env.FFMPEG_PATH = ffmpegPath;

const { start } = require('./src/bot');
start();
