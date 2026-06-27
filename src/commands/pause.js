const { getManager } = require('../music/GuildMusicManager');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
  name: 'pause',
  aliases: [],
  description: 'Pausa la reproducción',
  async execute(message) {
    const manager = getManager(message.guildId);
    if (manager.player.state.status !== AudioPlayerStatus.Playing) {
      return message.reply('No hay nada reproduciéndose.');
    }
    manager.pause();
    message.reply('⏸️ Pausado.');
  },
};
