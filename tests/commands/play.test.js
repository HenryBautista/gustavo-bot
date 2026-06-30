// Mocks must be declared before any require() calls that load the modules under test.

const mockManager = {
  queue: [],
  currentTrack: null,
  add: jest.fn().mockResolvedValue(true),
  addMany: jest.fn().mockResolvedValue(true),
};

jest.mock('../../src/music/GuildMusicManager', () => ({
  getManager: jest.fn(() => mockManager),
}));

jest.mock('../../src/music/sources/youtube', () => ({
  search: jest.fn(),
  getInfo: jest.fn(),
}));

jest.mock('../../src/music/sources/spotify', () => ({
  resolveSpotifyUrl: jest.fn(),
}));

jest.mock('../../src/music/sources/navidrome', () => ({
  search: jest.fn(),
}));

const mockResolver = {
  resolve: jest.fn(),
};

jest.mock('../../src/music/playlists', () => ({
  getResolver: jest.fn(),
}));

const { getResolver } = require('../../src/music/playlists');
const playCommand = require('../../src/commands/play');

function makeMessage(overrides = {}) {
  return {
    author: { tag: 'TestUser#0000', bot: false },
    guildId: 'guild-1',
    member: { voice: { channel: { id: 'vc-1', name: 'General' } } },
    channel: { send: jest.fn() },
    reply: jest.fn().mockResolvedValue(undefined),
    react: jest.fn().mockResolvedValue(undefined),
    reactions: { removeAll: jest.fn().mockResolvedValue(undefined) },
    ...overrides,
  };
}

function makeTracks(n) {
  return Array.from({ length: n }, (_, i) => ({
    title: `Track ${i}`,
    navSongId: `${i}`,
    source: 'navidrome',
    duration: 180,
    thumbnail: null,
    quality: null,
  }));
}

afterEach(() => {
  jest.clearAllMocks();
  mockManager.queue = [];
  mockManager.currentTrack = null;
});

describe('g!play — integración con flags', () => {
  describe('--shuffle en playlists', () => {
    test('pasa el input sin --shuffle al resolver', async () => {
      mockResolver.resolve.mockResolvedValue({ name: 'Rock Mix', tracks: makeTracks(5) });
      getResolver.mockReturnValue(mockResolver);

      await playCommand.execute(makeMessage(), ['nav:pl:rock', '--shuffle']);

      expect(mockResolver.resolve).toHaveBeenCalledWith('nav:pl:rock');
    });

    test('sin --shuffle: addMany recibe los tracks en el orden original', async () => {
      const tracks = makeTracks(5);
      mockResolver.resolve.mockResolvedValue({ name: 'Rock Mix', tracks });
      getResolver.mockReturnValue(mockResolver);

      await playCommand.execute(makeMessage(), ['nav:pl:rock']);

      const received = mockManager.addMany.mock.calls[0][0];
      expect(received.map((t) => t.title)).toEqual(tracks.map((t) => t.title));
    });

    test('con --shuffle: addMany recibe los mismos tracks (sin pérdida)', async () => {
      const tracks = makeTracks(20);
      mockResolver.resolve.mockResolvedValue({ name: 'Rock Mix', tracks });
      getResolver.mockReturnValue(mockResolver);

      await playCommand.execute(makeMessage(), ['nav:pl:rock', '--shuffle']);

      const received = mockManager.addMany.mock.calls[0][0];
      expect(received).toHaveLength(20);
      const receivedTitles = received.map((t) => t.title).sort();
      const originalTitles = tracks.map((t) => t.title).sort();
      expect(receivedTitles).toEqual(originalTitles);
    });

    test('con --shuffle: el orden difiere del original (con 20 tracks)', async () => {
      const tracks = makeTracks(20);
      mockResolver.resolve.mockResolvedValue({ name: 'Rock Mix', tracks });
      getResolver.mockReturnValue(mockResolver);

      // Intentar hasta 5 veces para evitar falsos negativos por coincidencia estadística
      let shuffled = false;
      for (let attempt = 0; attempt < 5 && !shuffled; attempt++) {
        jest.clearAllMocks();
        await playCommand.execute(makeMessage(), ['nav:pl:rock', '--shuffle']);
        const received = mockManager.addMany.mock.calls[0][0];
        if (received.some((t, i) => t.title !== tracks[i].title)) {
          shuffled = true;
        }
      }
      expect(shuffled).toBe(true);
    });

    test('con --shuffle: la respuesta incluye 🔀', async () => {
      mockResolver.resolve.mockResolvedValue({ name: 'Rock Mix', tracks: makeTracks(5) });
      getResolver.mockReturnValue(mockResolver);
      const message = makeMessage();

      await playCommand.execute(message, ['nav:pl:rock', '--shuffle']);

      expect(message.reply).toHaveBeenCalledWith(expect.stringContaining('🔀'));
    });

    test('sin --shuffle: la respuesta NO incluye 🔀', async () => {
      mockResolver.resolve.mockResolvedValue({ name: 'Rock Mix', tracks: makeTracks(5) });
      getResolver.mockReturnValue(mockResolver);
      const message = makeMessage();

      await playCommand.execute(message, ['nav:pl:rock']);

      expect(message.reply).not.toHaveBeenCalledWith(expect.stringContaining('🔀'));
    });

    test('--shuffle en track individual no rompe el comando', async () => {
      const { search } = require('../../src/music/sources/youtube');
      getResolver.mockReturnValue(null);
      search.mockResolvedValue({
        title: 'Bohemian Rhapsody',
        url: 'https://youtube.com/watch?v=abc',
        source: 'youtube',
        duration: 354,
        thumbnail: null,
        quality: null,
      });
      const message = makeMessage();

      await playCommand.execute(message, ['bohemian', 'rhapsody', '--shuffle']);

      expect(search).toHaveBeenCalledWith('bohemian rhapsody');
      expect(mockManager.add).toHaveBeenCalled();
    });
  });

  describe('sin usuario en canal de voz', () => {
    test('responde error cuando el usuario no está en un canal de voz', async () => {
      const message = makeMessage({ member: { voice: { channel: null } } });

      await playCommand.execute(message, ['nav:pl:rock']);

      expect(message.reply).toHaveBeenCalledWith(expect.stringContaining('canal de voz'));
    });
  });

  describe('args vacíos', () => {
    test('responde con instrucciones de uso cuando no hay args', async () => {
      const message = makeMessage();

      await playCommand.execute(message, []);

      expect(message.reply).toHaveBeenCalledWith(expect.stringContaining('g!play'));
    });

    test('args solo con flags se trata como vacío', async () => {
      const message = makeMessage();

      await playCommand.execute(message, ['--shuffle']);

      expect(message.reply).toHaveBeenCalledWith(expect.stringContaining('g!play'));
    });
  });
});
