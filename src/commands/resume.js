const { getManager } = require('../music/GuildMusicManager');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
  name: 'resume',
  aliases: ['r'],
  description: 'Reanuda la reproducción',
  async execute(message) {
    const manager = getManager(message.guildId);
    if (manager.player.state.status !== AudioPlayerStatus.Paused) {
      return message.reply('La reproducción no está pausada.');
    }
    manager.resume();
    message.reply('▶️ Reanudado.');
  },
};
