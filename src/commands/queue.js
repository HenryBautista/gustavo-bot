const { getManager } = require('../music/GuildMusicManager');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'queue',
  aliases: ['q'],
  description: 'Muestra la cola de reproducción',
  async execute(message) {
    const manager = getManager(message.guildId);

    if (!manager.currentTrack && !manager.queue.length) {
      return message.reply('La cola está vacía.');
    }

    const embed = new EmbedBuilder().setTitle('🎵 Cola de reproducción').setColor(0x1db954);

    if (manager.currentTrack) {
      embed.addFields({ name: '▶️ Ahora', value: manager.currentTrack.title });
    }

    if (manager.queue.length > 0) {
      const upcoming = manager.queue
        .slice(0, 10)
        .map((t, i) => `\`${i + 1}.\` ${t.title}`)
        .join('\n');
      embed.addFields({ name: 'Próximas', value: upcoming });
      if (manager.queue.length > 10) {
        embed.setFooter({ text: `... y ${manager.queue.length - 10} más` });
      }
    }

    message.reply({ embeds: [embed] });
  },
};
