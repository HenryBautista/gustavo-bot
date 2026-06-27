const { getManager } = require('../music/GuildMusicManager');

module.exports = {
  name: 'stop',
  aliases: [],
  description: 'Para la reproducción, limpia la cola y desconecta el bot',
  async execute(message) {
    const manager = getManager(message.guildId);
    if (!manager.currentTrack && !manager.queue.length) {
      return message.reply('No hay nada reproduciéndose.');
    }
    manager.stop();
    message.reply('⏹️ Detenido.');
  },
};
