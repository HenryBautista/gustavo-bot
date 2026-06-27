const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnectionStatus,
  AudioPlayerStatus,
} = require('@discordjs/voice');
const googleTTS = require('google-tts-api');
const { users, TARGET_VOICE_CHANNEL_ID } = require('../config');
const { getManager } = require('../music/GuildMusicManager');

let greetingConnection = null;
let greetingChannelId = null;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const resetGreetingConnection = () => {
  greetingConnection = null;
  greetingChannelId = null;
};

const disconnectIfAlone = async (guild) => {
  try {
    if (!greetingConnection || !greetingChannelId) return;
    const channel = guild.channels.cache.get(greetingChannelId);
    if (!channel) return;
    const humans = channel.members.filter((m) => !m.user.bot);
    console.log(`[Greeting] Humanos en canal: ${humans.size}`);
    if (humans.size === 0) {
      console.log('[Greeting] Canal vacío, desconectando...');
      greetingConnection.destroy();
      resetGreetingConnection();
    }
  } catch (err) {
    console.error('[Greeting] Error en disconnectIfAlone:', err);
  }
};

const ensureGreetingConnection = async (voiceChannel) => {
  const needsNew =
    !greetingConnection ||
    greetingConnection.state.status === VoiceConnectionStatus.Destroyed ||
    greetingConnection.state.status === VoiceConnectionStatus.Disconnected ||
    greetingChannelId !== voiceChannel.id;

  if (!needsNew) {
    console.log('[Greeting] Reutilizando conexión existente');
    return greetingConnection;
  }

  console.log(`[Greeting] Creando conexión en canal: ${voiceChannel.name}`);
  greetingConnection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: false,
  });

  greetingChannelId = voiceChannel.id;

  greetingConnection.on('stateChange', (oldState, newState) => {
    console.log(`[Greeting] Conexión: ${oldState.status} → ${newState.status}`);
    if (
      newState.status === VoiceConnectionStatus.Destroyed ||
      newState.status === VoiceConnectionStatus.Disconnected
    ) {
      resetGreetingConnection();
    }
  });

  await entersState(greetingConnection, VoiceConnectionStatus.Ready, 5000);
  console.log('[Greeting] Conexión lista');
  return greetingConnection;
};

const playGreeting = async (text, voiceChannel, lang = 'es') => {
  try {
    console.log(`[Greeting] Reproduciendo: "${text}" (lang: ${lang})`);
    const conn = await ensureGreetingConnection(voiceChannel);
    const url = googleTTS.getAudioUrl(text, { lang, slow: false });
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const resource = createAudioResource(response.body);
    const player = createAudioPlayer();

    player.on(AudioPlayerStatus.Playing, () => console.log('[Greeting] Audio iniciado'));
    player.on(AudioPlayerStatus.Idle, async () => {
      console.log('[Greeting] Audio terminado');
      await disconnectIfAlone(voiceChannel.guild);
    });
    player.on('error', (err) => console.error('[Greeting] Error de audio:', err));

    conn.subscribe(player);
    player.play(resource);
  } catch (err) {
    console.error('[Greeting] Error en playGreeting:', err);
  }
};

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    try {
      if (newState.member?.user?.bot) return;
      if (oldState.channelId === newState.channelId) return;

      const name = newState.member?.displayName || newState.member?.user?.username || 'usuario';

      if (oldState.channelId === TARGET_VOICE_CHANNEL_ID && !newState.channelId) {
        console.log(`[Greeting] ${name} salió del canal objetivo`);
        await disconnectIfAlone(oldState.guild);
      }

      const joinedChannel = newState.channelId;
      if (!joinedChannel || joinedChannel !== TARGET_VOICE_CHANNEL_ID) return;

      console.log(`[Greeting] ${name} entró al canal objetivo`);

      const musicManager = getManager(newState.guild.id);
      if (musicManager.currentTrack !== null) {
        console.log(`[Greeting] Música activa ("${musicManager.currentTrack.title}"), omitiendo saludo`);
        return;
      }

      const userData = users[newState.member.id];
      const textVoice = userData?.greeting ?? `${name} se unió!`;
      const lang = userData?.lang ?? 'es';

      console.log(`[Greeting] Saludo para ${name}: "${textVoice}"`);
      await delay(1000);
      await playGreeting(textVoice, newState.channel, lang);
    } catch (err) {
      console.error('[Greeting] Error en voiceStateUpdate:', err);
    }
  },
};
