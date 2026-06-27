const { PREFIX } = require('../config');
const commands = require('../commands');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    const command = commands.get(commandName);
    if (!command) {
      console.log(`[CMD] Comando desconocido: "${commandName}" (usuario: ${message.author.tag})`);
      return;
    }

    console.log(`[CMD] ${message.author.tag} ejecutó: ${PREFIX}${commandName}${args.length ? ' ' + args.join(' ') : ''}`);

    try {
      await command.execute(message, args);
    } catch (err) {
      console.error(`[CMD] Error ejecutando "${commandName}":`, err);
      message.reply('Ocurrió un error al ejecutar ese comando.').catch(() => {});
    }
  },
};
