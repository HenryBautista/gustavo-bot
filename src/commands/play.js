const { getManager } = require('../music/GuildMusicManager');
const youtube = require('../music/sources/youtube');
const spotify = require('../music/sources/spotify');
const navidrome = require('../music/sources/navidrome');
const { getResolver } = require('../music/playlists');

const PLAYLIST_LIMIT = 50;
const YT_URL_RE = /(?:youtube\.com\/(?:watch|shorts)|youtu\.be\/)/;

module.exports = {
  name: 'play',
  aliases: ['p'],
  description: 'Reproduce de YouTube, Spotify, o `nav:<búsqueda>` para Navidrome',
  usage: '<URL o búsqueda> | nav:<búsqueda>',
  async execute(message, args) {
    if (!args.length) {
      return message.reply(`Uso: \`g!play <búsqueda o URL>\` · Para Navidrome: \`g!play nav:<búsqueda>\``);
    }

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply('Tienes que estar en un canal de voz.');
    }

    const input = args.join(' ');
    const manager = getManager(message.guildId);

    console.log(`[CMD:play] Input: "${input}" | Usuario: ${message.author.tag} | Canal: ${voiceChannel.name}`);

    await message.react('⏳').catch(() => {});

    try {
      const resolver = getResolver(input);
      if (resolver) {
        const { name, tracks } = await resolver.resolve(input);
        const limited = tracks.slice(0, PLAYLIST_LIMIT);
        const wasIdle = await manager.addMany(limited, voiceChannel, message.channel);
        await message.reactions.removeAll().catch(() => {});
        const limitNote = tracks.length > PLAYLIST_LIMIT ? ` (mostrando ${PLAYLIST_LIMIT} de ${tracks.length})` : '';
        const verb = wasIdle ? '▶️ Reproduciendo playlist' : '✅ Playlist añadida a la cola';
        return message.reply(`${verb}: **${name}** — ${limited.length} canciones${limitNote}`);
      }

      let track;

      if (input.toLowerCase().startsWith('nav:')) {
        const query = input.slice(4).trim();
        if (!query) return message.reply('Escribe algo para buscar en Navidrome. Ej: `g!play nav:bohemian rhapsody`');
        console.log(`[CMD:play] Fuente detectada: Navidrome | Query: "${query}"`);
        const results = await navidrome.search(query);
        if (!results.length) return message.reply(`No encontré nada en Navidrome para: **${query}**`);
        track = results[0];
      } else if (input.includes('spotify.com')) {
        console.log('[CMD:play] Fuente detectada: Spotify');
        track = await spotify.resolveSpotifyUrl(input);
        track.source = 'spotify→youtube';
      } else if (YT_URL_RE.test(input)) {
        console.log('[CMD:play] Fuente detectada: YouTube URL');
        track = await youtube.getInfo(input);
      } else {
        console.log(`[CMD:play] Fuente detectada: búsqueda YouTube | Query: "${input}"`);
        track = await youtube.search(input);
        if (!track) return message.reply(`No encontré resultados para: **${input}**`);
      }

      console.log(`[CMD:play] Track resuelto: "${track.title}" [${track.source}]`);
      const startedFresh = await manager.add(track, voiceChannel, message.channel);

      await message.reactions.removeAll().catch(() => {});
      const sourceLabel = { youtube: 'YouTube', 'spotify→youtube': 'Spotify', navidrome: 'Navidrome' }[track.source] ?? track.source;
      const qualityStr = track.quality ? ` • ${track.quality}` : '';
      if (startedFresh) {
        message.reply(`▶️ Reproduciendo: **${track.title}** — ${sourceLabel}${qualityStr}`);
      } else {
        message.reply(`✅ Añadido a la cola (#${manager.queue.length + 1}): **${track.title}** — ${sourceLabel}${qualityStr}`);
      }
    } catch (err) {
      console.error('[CMD:play] Error:', err);
      await message.reactions.removeAll().catch(() => {});
      message.reply(`Error: ${err.message}`);
    }
  },
};
