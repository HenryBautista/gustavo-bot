const { getManager } = require('../music/GuildMusicManager');

module.exports = {
  name: 'clear',
  aliases: ['cl'],
  description: 'Vacía la cola de reproducción (mantiene la canción actual)',
  async execute(message) {
    const manager = getManager(message.guildId);
    if (manager.queue.length === 0) {
      return message.reply('La cola ya está vacía.');
    }
    const count = manager.clearQueue();
    message.reply(`🗑️ Cola vaciada (${count} canción${count !== 1 ? 'es' : ''} eliminada${count !== 1 ? 's' : ''}).`);
  },
};
