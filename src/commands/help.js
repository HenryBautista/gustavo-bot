const { EmbedBuilder } = require('discord.js');
const { PREFIX } = require('../config');

module.exports = {
  name: 'help',
  aliases: ['h'],
  description: 'Muestra los comandos disponibles',
  async execute(message) {
    const p = PREFIX;
    const embed = new EmbedBuilder()
      .setTitle('🤖 Comandos de Gustavo Bot')
      .setColor(0x5865f2)
      .addFields(
        {
          name: `\`${p}play <búsqueda|URL>\` · \`${p}p\``,
          value: 'Reproduce de YouTube, una URL de Spotify, o usa `nav:<búsqueda>` para tu librería en Navidrome',
        },
        { name: `\`${p}skip\` · \`${p}s\``, value: 'Salta la canción actual' },
        { name: `\`${p}stop\``, value: 'Para la reproducción, limpia la cola y desconecta el bot' },
        { name: `\`${p}pause\``, value: 'Pausa la reproducción' },
        { name: `\`${p}resume\` · \`${p}r\``, value: 'Reanuda la reproducción pausada' },
        { name: `\`${p}queue\` · \`${p}q\``, value: 'Muestra la cola de reproducción (hasta 10 canciones)' },
        { name: `\`${p}np\` · \`${p}nowplaying\``, value: 'Muestra la canción que se está reproduciendo' },
        { name: `\`${p}help\` · \`${p}h\``, value: 'Muestra este mensaje' },
      )
      .setFooter({ text: `Ejemplos: ${p}play lo fi | ${p}play nav:jazz | ${p}play https://open.spotify.com/track/...` });

    message.reply({ embeds: [embed] });
  },
};
