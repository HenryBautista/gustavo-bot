const mockPlayer = {
  on: jest.fn(),
  play: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  unpause: jest.fn(),
  state: { status: 'idle' },
};

const mockConnection = {
  on: jest.fn(),
  subscribe: jest.fn(),
  destroy: jest.fn(),
  state: { status: 'ready' },
};

jest.mock('@discordjs/voice', () => ({
  createAudioPlayer: jest.fn(() => mockPlayer),
  createAudioResource: jest.fn(),
  AudioPlayerStatus: { Idle: 'idle' },
  VoiceConnectionStatus: { Ready: 'ready', Destroyed: 'destroyed', Disconnected: 'disconnected' },
  entersState: jest.fn().mockResolvedValue(undefined),
  joinVoiceChannel: jest.fn(() => mockConnection),
}));

const mockYtdlpProc = { kill: jest.fn() };
jest.mock('../../src/music/sources/ytdlp', () => ({
  stream: jest.fn(() => ({ stream: {}, process: mockYtdlpProc })),
}));

const { getManager } = require('../../src/music/GuildMusicManager');

const mockVoiceChannel = {
  id: 'vc-1',
  name: 'General',
  members: { filter: jest.fn(() => ({ size: 1 })) },
  guild: { id: 'guild-1', voiceAdapterCreator: jest.fn() },
};

function track(overrides = {}) {
  return { title: 'Test Song', url: 'https://youtube.com/watch?v=test', source: 'youtube', duration: 180, thumbnail: null, quality: null, ...overrides };
}

let guildId = 0;
function freshManager() {
  const manager = getManager(`test-guild-${++guildId}`);
  // Prevent actual playback; we test queue state only
  jest.spyOn(manager, '_playNext').mockImplementation(() => {});
  return manager;
}

afterEach(() => {
  jest.clearAllMocks();
  mockPlayer.state.status = 'idle';
});

describe('GuildMusicManager.add', () => {
  test('pushes one track to the queue', async () => {
    const manager = freshManager();
    await manager.add(track(), mockVoiceChannel);
    expect(manager.queue).toHaveLength(1);
  });

  test('returns true when queue was empty (started fresh)', async () => {
    const manager = freshManager();
    const result = await manager.add(track(), mockVoiceChannel);
    expect(result).toBe(true);
  });

  test('returns false when a track is already playing', async () => {
    const manager = freshManager();
    manager.currentTrack = track({ title: 'Now Playing' });
    const result = await manager.add(track(), mockVoiceChannel);
    expect(result).toBe(false);
  });

  test('stores textChannel reference when provided', async () => {
    const manager = freshManager();
    const fakeChannel = { send: jest.fn() };
    await manager.add(track(), mockVoiceChannel, fakeChannel);
    expect(manager.textChannel).toBe(fakeChannel);
  });
});

describe('GuildMusicManager.addMany', () => {
  test('pushes all tracks to the queue', async () => {
    const manager = freshManager();
    const tracks = [track({ title: 'A' }), track({ title: 'B' }), track({ title: 'C' })];
    await manager.addMany(tracks, mockVoiceChannel);
    expect(manager.queue).toHaveLength(3);
  });

  test('returns true when queue was empty', async () => {
    const manager = freshManager();
    const result = await manager.addMany([track()], mockVoiceChannel);
    expect(result).toBe(true);
  });

  test('returns false when a track is already playing', async () => {
    const manager = freshManager();
    manager.currentTrack = track();
    const result = await manager.addMany([track()], mockVoiceChannel);
    expect(result).toBe(false);
  });

  test('preserves queue order', async () => {
    const manager = freshManager();
    const tracks = [track({ title: 'First' }), track({ title: 'Second' }), track({ title: 'Third' })];
    await manager.addMany(tracks, mockVoiceChannel);
    expect(manager.queue[0].title).toBe('First');
    expect(manager.queue[1].title).toBe('Second');
    expect(manager.queue[2].title).toBe('Third');
  });
});

describe('GuildMusicManager.stop', () => {
  test('clears queue and currentTrack', () => {
    const manager = freshManager();
    manager.queue = [track(), track()];
    manager.currentTrack = track();
    manager.connection = { destroy: jest.fn(), state: { status: 'ready' } };
    manager.stop();
    expect(manager.queue).toHaveLength(0);
    expect(manager.currentTrack).toBeNull();
  });

  test('destroys voice connection', () => {
    const manager = freshManager();
    const fakeConn = { destroy: jest.fn() };
    manager.connection = fakeConn;
    manager.stop();
    expect(fakeConn.destroy).toHaveBeenCalled();
  });
});

describe('GuildMusicManager.skip', () => {
  test('calls player.stop()', () => {
    const manager = freshManager();
    manager.skip();
    expect(manager.player.stop).toHaveBeenCalled();
  });
});

describe('GuildMusicManager.pause and resume', () => {
  test('pause() calls player.pause()', () => {
    const manager = freshManager();
    manager.pause();
    expect(manager.player.pause).toHaveBeenCalled();
  });

  test('resume() calls player.unpause()', () => {
    const manager = freshManager();
    manager.resume();
    expect(manager.player.unpause).toHaveBeenCalled();
  });
});

describe('GuildMusicManager.clearQueue', () => {
  test('vacía la cola y devuelve el número de tracks eliminados', () => {
    const manager = freshManager();
    manager.queue = [track({ title: 'A' }), track({ title: 'B' }), track({ title: 'C' })];
    const count = manager.clearQueue();
    expect(manager.queue).toHaveLength(0);
    expect(count).toBe(3);
  });

  test('no afecta currentTrack', () => {
    const manager = freshManager();
    const playing = track({ title: 'Now Playing' });
    manager.currentTrack = playing;
    manager.queue = [track(), track()];
    manager.clearQueue();
    expect(manager.currentTrack).toBe(playing);
  });

  test('devuelve 0 cuando la cola ya está vacía', () => {
    const manager = freshManager();
    const count = manager.clearQueue();
    expect(count).toBe(0);
    expect(manager.queue).toHaveLength(0);
  });
});

describe('GuildMusicManager guild isolation', () => {
  test('different guild IDs get independent queues', async () => {
    const m1 = freshManager();
    const m2 = freshManager();
    await m1.add(track({ title: 'Guild 1 Song' }), mockVoiceChannel);
    expect(m1.queue).toHaveLength(1);
    expect(m2.queue).toHaveLength(0);
  });
});

describe('GuildMusicManager — yt-dlp process cleanup', () => {
  test('stop() calls kill on the current yt-dlp process when one exists', () => {
    const manager = freshManager();
    const fakeProc = { kill: jest.fn() };
    manager._currentYtdlpProc = fakeProc;
    manager.connection = { destroy: jest.fn() };
    manager.stop();
    expect(fakeProc.kill).toHaveBeenCalledWith('SIGKILL');
  });

  test('stop() is safe when no yt-dlp process is running', () => {
    const manager = freshManager();
    manager.connection = { destroy: jest.fn() };
    expect(() => manager.stop()).not.toThrow();
  });

  test('_currentYtdlpProc is null after stop()', () => {
    const manager = freshManager();
    manager._currentYtdlpProc = { kill: jest.fn() };
    manager.connection = { destroy: jest.fn() };
    manager.stop();
    expect(manager._currentYtdlpProc).toBeNull();
  });

  test('_buildResource kills previous yt-dlp process before starting a new one', async () => {
    const manager = freshManager();
    const oldProc = { kill: jest.fn() };
    manager._currentYtdlpProc = oldProc;
    await manager._buildResource(track());
    expect(oldProc.kill).toHaveBeenCalledWith('SIGKILL');
  });
});
