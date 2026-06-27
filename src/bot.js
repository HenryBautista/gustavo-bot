const { Client, GatewayIntentBits } = require('discord.js');

const eventHandlers = [
  require('./events/ready'),
  require('./events/voiceStateUpdate'),
  require('./events/messageCreate'),
];

function start() {
  if (!process.env.DISCORD_TOKEN) {
    throw new Error('Falta DISCORD_TOKEN en .env');
  }

  console.log('[Bot] Iniciando cliente Discord...');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  for (const handler of eventHandlers) {
    console.log(`[Bot] Registrando evento: ${handler.name}`);
    if (handler.once) {
      client.once(handler.name, (...args) => handler.execute(...args));
    } else {
      client.on(handler.name, (...args) => handler.execute(...args));
    }
  }

  client.on('error', (err) => console.error('[Bot] Error de cliente:', err));
  process.on('unhandledRejection', (err) => console.error('[Bot] Unhandled rejection:', err));

  console.log('[Bot] Conectando a Discord...');
  client.login(process.env.DISCORD_TOKEN);
}

module.exports = { start };
