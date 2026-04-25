require('dotenv').config();

const ffmpegPath = require('ffmpeg-static');
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
        greeting: `Cuiden sus carteras un Veneco acaba de entrar!`,
        name: 'Alonzo'
    },
    "515647010804596757": {
        message: 'Bienvenido my Fiurer!',
        greeting: 'Bienvenido my Fiurer!',
        name: 'Zhay'
    },
    "758671468783075359": {
        message: 'Hola Texto',
        greeting: 'Hola',
        name: 'Cinder'
    }
}

client.once('clientReady', () => {
  console.log(`Bot ready as ${client.user.tag}`);
});

client.on('error', console.error);
process.on('unhandledRejection', console.error);

const sendMessageToChannel = async (text, channelId) => {
    const textChannel = await client.channels.fetch(channelId);
    
    if (textChannel) {
        textChannel.send(text);
    }
}

const playTextAtChannel = (text, voiceChannel) => {
    
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    const url = googleTTS.getAudioUrl(text, {
        lang: 'es',
        slow: false,
    });

    const player = createAudioPlayer();

    const resource = createAudioResource(url, {
        inputType: StreamType.Arbitrary,
    });

    player.play(resource);
    connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
    });
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


client.on('voiceStateUpdate', async (oldState, newState) => {

    const joinedChannel = oldState.channelId !== newState.channelId && newState.channelId;
  
    if (!joinedChannel) return;

    if (newState.channelId !== TARGET_VOICE_CHANNEL_ID) return;

    const userData = users[newState.id];

    if (!userData) return;

    try {
        const voiceChannel = newState.channel;
        sendMessageToChannel(userData.message, TEXT_CHANNEL_ID);
        await delay(1000);
        playTextAtChannel(userData.greeting, voiceChannel);
    } catch (err) {
        console.error("Error en voiceStateUpdate:", err);
    }
});

client.login(TOKEN);