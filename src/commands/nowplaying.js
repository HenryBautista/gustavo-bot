const { getManager } = require('../music/GuildMusicManager');
const { EmbedBuilder } = require('discord.js');

const SOURCE_LABELS = {
  youtube: '🎬 YouTube',
  'spotify→youtube': '🟢 Spotify → YouTube',
  navidrome: '🎵 Navidrome',
};

module.exports = {
  name: 'nowplaying',
  aliases: ['np'],
  description: 'Muestra la canción que se está reproduciendo',
  async execute(message) {
    const manager = getManager(message.guildId);

    if (!manager.currentTrack) {
      return message.reply('No hay nada reproduciéndose.');
    }

    const track = manager.currentTrack;
    const fields = [{ name: 'Fuente', value: SOURCE_LABELS[track.source] ?? track.source, inline: true }];
    if (track.quality) fields.push({ name: 'Calidad', value: track.quality, inline: true });

    const embed = new EmbedBuilder()
      .setTitle('▶️ Reproduciendo ahora')
      .setDescription(`**${track.title}**`)
      .addFields(...fields)
      .setColor(0x1db954);

    if (track.thumbnail) embed.setThumbnail(track.thumbnail);

    message.reply({ embeds: [embed] });
  },
};
