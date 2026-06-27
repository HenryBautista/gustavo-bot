const {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  joinVoiceChannel,
} = require('@discordjs/voice');
const { stream: ytdlpStream } = require('./sources/ytdlp');

class GuildMusicManager {
  constructor(guildId) {
    this.guildId = guildId;
    this.queue = [];
    this.currentTrack = null;
    this.player = createAudioPlayer();
    this.connection = null;
    this.voiceChannel = null;
    this.textChannel = null;
    this._setupPlayerEvents();
  }

  _setupPlayerEvents() {
    this.player.on(AudioPlayerStatus.Idle, () => {
      console.log(`[Music:${this.guildId}] Player inactivo, avanzando cola...`);
      this.currentTrack = null;
      this._playNext();
    });

    this.player.on('error', (err) => {
      console.error(`[Music:${this.guildId}] Error del player:`, err);
      this.currentTrack = null;
      this._playNext();
    });
  }

  async ensureConnection(voiceChannel) {
    const needsNew =
      !this.connection ||
      this.connection.state.status === VoiceConnectionStatus.Destroyed ||
      this.connection.state.status === VoiceConnectionStatus.Disconnected;

    if (!needsNew) return;

    console.log(`[Music:${this.guildId}] Creando conexión en canal: ${voiceChannel.name}`);
    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    this.voiceChannel = voiceChannel;

    this.connection.on('stateChange', (oldState, newState) => {
      console.log(`[Voice:${this.guildId}] ${oldState.status} → ${newState.status}`);
      if (
        newState.status === VoiceConnectionStatus.Destroyed ||
        newState.status === VoiceConnectionStatus.Disconnected
      ) {
        console.log(`[Music:${this.guildId}] Conexión perdida, limpiando estado`);
        this.connection = null;
        this.voiceChannel = null;
        this.queue = [];
        this.currentTrack = null;
        this.player.stop(true);
      }
    });

    await entersState(this.connection, VoiceConnectionStatus.Ready, 5000);
    this.connection.subscribe(this.player);
    console.log(`[Music:${this.guildId}] Conexión lista`);
  }

  async add(track, voiceChannel, textChannel = null) {
    if (textChannel) this.textChannel = textChannel;
    await this.ensureConnection(voiceChannel);
    const wasIdle = this.currentTrack === null && this.queue.length === 0;
    this.queue.push(track);
    console.log(`[Music:${this.guildId}] Track añadido: "${track.title}" (cola: ${this.queue.length})`);
    if (this.player.state.status === AudioPlayerStatus.Idle && this.currentTrack === null) {
      this._playNext();
    }
    return wasIdle;
  }

  _playNext() {
    if (this.queue.length === 0) {
      console.log(`[Music:${this.guildId}] Cola vacía`);
      this._maybeDisconnect();
      return;
    }

    this.currentTrack = this.queue.shift();
    console.log(`[Music:${this.guildId}] Reproduciendo: "${this.currentTrack.title}" [${this.currentTrack.source}] (${this.queue.length} en cola)`);
    this._buildAndPlay(this.currentTrack).catch((err) => {
      console.error(`[Music:${this.guildId}] Error al reproducir "${this.currentTrack?.title}":`, err);
      this.currentTrack = null;
      this._playNext();
    });
  }

  async _buildAndPlay(track) {
    const resource = await this._buildResource(track);
    if (!resource) {
      console.error(`[Music:${this.guildId}] No se pudo reproducir, saltando: "${track.title}"`);
      this.textChannel
        ?.send(`❌ No se pudo reproducir: **${track.title}**\nEste video de YouTube no está disponible para streaming (puede estar protegido o restringido). Saltando...`)
        .catch(() => {});
      this.currentTrack = null;
      this._playNext();
      return;
    }
    this.player.play(resource);
  }

  async _buildResource(track) {
    try {
      if (track.source === 'navidrome') {
        const { buildStreamUrl } = require('./sources/navidrome');
        const url = buildStreamUrl(track.navSongId);
        console.log(`[Music:${this.guildId}] Fetch Navidrome stream: songId=${track.navSongId}`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Navidrome HTTP ${response.status}`);
        console.log(`[Music:${this.guildId}] Stream Navidrome OK`);
        return createAudioResource(response.body);
      }

      console.log(`[Music:${this.guildId}] Obteniendo stream via yt-dlp: ${track.url}`);
      const audioStream = ytdlpStream(track.url);
      console.log(`[Music:${this.guildId}] Stream yt-dlp iniciado`);
      return createAudioResource(audioStream);
    } catch (err) {
      console.error(`[Music:${this.guildId}] Error construyendo recurso para "${track.title}":`, err);
      return null;
    }
  }

  _maybeDisconnect() {
    if (!this.connection || !this.voiceChannel) return;
    const humans = this.voiceChannel.members.filter((m) => !m.user.bot);
    console.log(`[Music:${this.guildId}] Humanos en canal: ${humans.size}`);
    if (humans.size === 0) {
      console.log(`[Music:${this.guildId}] Canal vacío, desconectando`);
      this.connection.destroy();
    }
  }

  skip() {
    console.log(`[Music:${this.guildId}] Skip: "${this.currentTrack?.title}"`);
    this.player.stop();
  }

  stop() {
    console.log(`[Music:${this.guildId}] Stop: limpiando cola (${this.queue.length} tracks) y desconectando`);
    this.queue = [];
    this.currentTrack = null;
    this.player.stop(true);
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
      this.voiceChannel = null;
    }
  }

  pause() {
    console.log(`[Music:${this.guildId}] Pause`);
    this.player.pause();
  }

  resume() {
    console.log(`[Music:${this.guildId}] Resume`);
    this.player.unpause();
  }
}

const managers = new Map();

function getManager(guildId) {
  if (!managers.has(guildId)) {
    managers.set(guildId, new GuildMusicManager(guildId));
  }
  return managers.get(guildId);
}

module.exports = { getManager };
