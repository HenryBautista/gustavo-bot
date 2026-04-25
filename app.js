require('dotenv').config();
const ffmpegPath = require('ffmpeg-static');
const { entersState, VoiceConnectionStatus } = require('@discordjs/voice');
process.env.FFMPEG_PATH = ffmpegPath;

const { Client, GatewayIntentBits } = require('discord.js');
const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus,
  StreamType
} = require('@discordjs/voice');

const googleTTS = require('google-tts-api');
const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  throw new Error("Falta DISCORD_TOKEN en .env");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
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
    }
}

client.once('clientReady', () => {
  console.log(`Bot ready as ${client.user.tag}`);
});

client.on('error', console.error);
process.on('unhandledRejection', console.error);

let connection = null;
let currentChannelId = null;

const sendMessageToChannel = async (text, channelId) => {
    const textChannel = await client.channels.fetch(channelId);
    
    if (textChannel) {
        textChannel.send(text);
    }
}

const playTextAtChannel = async (text, voiceChannel) => {
  try {
    if (!connection || currentChannelId !== voiceChannel.id) {
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      currentChannelId = voiceChannel.id;

      await entersState(connection, VoiceConnectionStatus.Ready, 5000);
    }

    const url = googleTTS.getAudioUrl(text, {
      lang: 'es',
      slow: false,
    });

    const player = createAudioPlayer();
    const response = await fetch(url);
    const resource = createAudioResource(response.body);

    player.play(resource);
    connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, () => {
      setTimeout(() => {
        if (voiceChannel.members.size <= 1) {
          connection.destroy();
          connection = null;
          currentChannelId = null;
        }
      }, 3000);
    });

    player.on('error', (err) => {
      console.error("Audio error:", err);
    });

  } catch (err) {
    console.error("Error en playTextAtChannel:", err);
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


client.on('voiceStateUpdate', async (oldState, newState) => {

  if (newState.member?.user?.bot) return;

  if (oldState.channelId === newState.channelId) return;

  const joinedChannel = newState.channelId;
  
  if (!joinedChannel) return;

  if (newState.channelId !== TARGET_VOICE_CHANNEL_ID) return;

  const userData = users[newState.id];
  const name = newState.member?.displayName || newState.member?.user?.username || "usuario";

  const textMessage = userData?.message ?? `Bienvenido ${name}`;
  const textVoice = userData?.greeting ?? `${name} se unió!`;

  try {
      const voiceChannel = newState.channel;
      await sendMessageToChannel(textMessage, TEXT_CHANNEL_ID);
      await delay(1000);
      await playTextAtChannel(textVoice, voiceChannel);
    } catch (err) {
        console.error("Error en voiceStateUpdate:", err);
    }
});

client.login(TOKEN);