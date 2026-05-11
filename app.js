require('dotenv').config();

const ffmpegPath = require('ffmpeg-static');
process.env.FFMPEG_PATH = ffmpegPath;

const { Client, GatewayIntentBits } = require('discord.js');

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnectionStatus,
  AudioPlayerStatus,
} = require('@discordjs/voice');

const googleTTS = require('google-tts-api');

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  throw new Error('Falta DISCORD_TOKEN en .env');
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const TEXT_CHANNEL_ID = "1458616507415400554";
const TARGET_VOICE_CHANNEL_ID = "1458616507415400554";

const users = {
  "1153041199129698354": {
    message: `Un negro acaba de entrar 👀`,
    greeting: `Un Veneco acaba de entrar!`,
    name: 'Alonzo'
  },
  "515647010804596757": {
    message: 'Bienvenido my Fiurer!',
    greeting: 'Bienvenido my Fiurer!',
    name: 'Zhay'
  },
  "758671468783075359": {
    message: 'Hola Padre',
    greeting: 'Hola padre',
    name: 'Cinder'
  },
  "1399448990772232464": {
    message: 'croissant',
    greeting: 'croissant',
    name: 'Blue',
    lang: 'fr'
  }
};

let connection = null;
let currentChannelId = null;

client.once('clientReady', () => {
  console.log(`Bot ready as ${client.user.tag}`);
});

client.on('error', console.error);
process.on('unhandledRejection', console.error);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const sendMessageToChannel = async (text, channelId) => {
  try {
    const textChannel = await client.channels.fetch(channelId);

    if (textChannel) {
      await textChannel.send(text);
    }
  } catch (err) {
    console.error('Error enviando mensaje:', err);
  }
};

const resetConnection = () => {
  connection = null;
  currentChannelId = null;
};

const disconnectIfAlone = async (guild) => {
  try {
    if (!connection || !currentChannelId) return;

    const channel = guild.channels.cache.get(currentChannelId);

    if (!channel) return;

    const humans = channel.members.filter(member => !member.user.bot);

    console.log(`Humanos en canal: ${humans.size}`);

    if (humans.size === 0) {
      console.log('Desconectando por estar solo...');

      connection.destroy();
      resetConnection();
    }
  } catch (err) {
    console.error('Error en disconnectIfAlone:', err);
  }
};

const ensureConnection = async (voiceChannel) => {
  const needsNewConnection =
    !connection ||
    connection.state.status === VoiceConnectionStatus.Destroyed ||
    connection.state.status === VoiceConnectionStatus.Disconnected ||
    currentChannelId !== voiceChannel.id;

  if (!needsNewConnection) {
    return connection;
  }

  console.log('Creando nueva conexión de voz...');

  connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: false,
  });

  currentChannelId = voiceChannel.id;

  connection.on('stateChange', (oldState, newState) => {
    console.log(`Voice: ${oldState.status} -> ${newState.status}`);

    if (
      newState.status === VoiceConnectionStatus.Destroyed ||
      newState.status === VoiceConnectionStatus.Disconnected
    ) {
      resetConnection();
    }
  });

  await entersState(connection, VoiceConnectionStatus.Ready, 5000);

  return connection;
};

const playTextAtChannel = async (text, voiceChannel, lang = 'es') => {
  try {
    const activeConnection = await ensureConnection(voiceChannel);

    const url = googleTTS.getAudioUrl(text, {
      lang,
      slow: false,
    });

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const resource = createAudioResource(response.body);

    const player = createAudioPlayer();

    player.on(AudioPlayerStatus.Playing, () => {
      console.log('Reproduciendo audio...');
    });

    player.on(AudioPlayerStatus.Idle, async () => {
      console.log('Audio terminado');

      await disconnectIfAlone(voiceChannel.guild);
    });

    player.on('error', (err) => {
      console.error('Audio error:', err);
    });

    activeConnection.subscribe(player);

    player.play(resource);

  } catch (err) {
    console.error('Error en playTextAtChannel:', err);
  }
};

client.on('voiceStateUpdate', async (oldState, newState) => {
  try {

    if (newState.member?.user?.bot) return;

    if (oldState.channelId === newState.channelId) return;

    // Verifica si alguien salió del canal objetivo
    if (
      oldState.channelId === TARGET_VOICE_CHANNEL_ID &&
      !newState.channelId
    ) {
      await disconnectIfAlone(oldState.guild);
    }

    const joinedChannel = newState.channelId;

    if (!joinedChannel) return;

    if (joinedChannel !== TARGET_VOICE_CHANNEL_ID) return;

    const userData = users[newState.id];

    const name =
      newState.member?.displayName ||
      newState.member?.user?.username ||
      'usuario';

    const textMessage =
      userData?.message ??
      `Bienvenido ${name}`;

    const textVoice =
      userData?.greeting ??
      `${name} se unió!`;

    const lang = userData?.lang || 'es';

    const voiceChannel = newState.channel;

    // await sendMessageToChannel(textMessage, TEXT_CHANNEL_ID);

    await delay(1000);

    await playTextAtChannel(textVoice, voiceChannel, lang);

  } catch (err) {
    console.error('Error en voiceStateUpdate:', err);
  }
});

client.login(TOKEN);