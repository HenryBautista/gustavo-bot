const { getManager } = require('../music/GuildMusicManager');

module.exports = {
  name: 'skip',
  aliases: ['s'],
  description: 'Salta la canción actual',
  async execute(message) {
    const manager = getManager(message.guildId);
    if (!manager.currentTrack) {
      return message.reply('No hay nada reproduciéndose.');
    }
    manager.skip();
    message.reply('⏭️ Saltando...');
  },
};
