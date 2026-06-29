beforeAll(() => {
  process.env.NAVIDROME_URL = 'http://localhost:4533';
  process.env.NAVIDROME_USER = 'admin';
  process.env.NAVIDROME_PASS = 'secret';
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.clearAllMocks();
});

const { search, getPlaylists, getPlaylist, buildStreamUrl } = require('../../src/music/sources/navidrome');

function makeSubsonicOk(data) {
  return {
    ok: true,
    json: async () => ({ 'subsonic-response': { status: 'ok', ...data } }),
  };
}

describe('navidrome.search', () => {
  test('maps API songs to track objects', async () => {
    global.fetch.mockResolvedValueOnce(makeSubsonicOk({
      searchResult3: {
        song: [{ id: '1', title: 'Bohemian Rhapsody', artist: 'Queen', duration: 354, bitRate: 320 }],
      },
    }));

    const results = await search('bohemian');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      title: 'Bohemian Rhapsody — Queen',
      navSongId: '1',
      duration: 354,
      source: 'navidrome',
      thumbnail: null,
      quality: '320 kbps',
    });
  });

  test('returns empty array when no songs found', async () => {
    global.fetch.mockResolvedValueOnce(makeSubsonicOk({ searchResult3: { song: [] } }));
    const results = await search('nonexistent');
    expect(results).toHaveLength(0);
  });

  test('quality is null when bitRate is missing', async () => {
    global.fetch.mockResolvedValueOnce(makeSubsonicOk({
      searchResult3: {
        song: [{ id: '2', title: 'Song', artist: 'Artist', duration: 180 }],
      },
    }));
    const results = await search('song');
    expect(results[0].quality).toBeNull();
  });

  test('throws when HTTP request fails', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(search('query')).rejects.toThrow('HTTP 500');
  });

  test('throws on Subsonic error status', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        'subsonic-response': { status: 'failed', error: { message: 'Wrong credentials' } },
      }),
    });
    await expect(search('query')).rejects.toThrow('Wrong credentials');
  });
});

describe('navidrome.getPlaylists', () => {
  test('returns array of playlists', async () => {
    global.fetch.mockResolvedValueOnce(makeSubsonicOk({
      playlists: {
        playlist: [
          { id: '10', name: 'Favoritos', songCount: 15 },
          { id: '11', name: 'Rock Mix', songCount: 8 },
        ],
      },
    }));

    const lists = await getPlaylists();
    expect(lists).toHaveLength(2);
    expect(lists[0]).toEqual({ id: '10', name: 'Favoritos', songCount: 15 });
    expect(lists[1]).toEqual({ id: '11', name: 'Rock Mix', songCount: 8 });
  });

  test('handles single playlist (API returns object instead of array)', async () => {
    global.fetch.mockResolvedValueOnce(makeSubsonicOk({
      playlists: { playlist: { id: '10', name: 'Solo', songCount: 3 } },
    }));

    const lists = await getPlaylists();
    expect(lists).toHaveLength(1);
    expect(lists[0].name).toBe('Solo');
  });

  test('returns empty array when no playlists exist', async () => {
    global.fetch.mockResolvedValueOnce(makeSubsonicOk({ playlists: {} }));
    const lists = await getPlaylists();
    expect(lists).toEqual([]);
  });
});

describe('navidrome.getPlaylist', () => {
  test('returns playlist name and mapped tracks', async () => {
    global.fetch.mockResolvedValueOnce(makeSubsonicOk({
      playlist: {
        id: '10',
        name: 'Favoritos',
        entry: [
          { id: '101', title: 'Stairway to Heaven', artist: 'Led Zeppelin', duration: 480, bitRate: 256 },
          { id: '102', title: 'Hotel California', artist: 'Eagles', duration: 390, bitRate: 320 },
        ],
      },
    }));

    const result = await getPlaylist('10');
    expect(result.name).toBe('Favoritos');
    expect(result.tracks).toHaveLength(2);
    expect(result.tracks[0]).toEqual({
      title: 'Stairway to Heaven — Led Zeppelin',
      navSongId: '101',
      duration: 480,
      source: 'navidrome',
      thumbnail: null,
      quality: '256 kbps',
    });
  });

  test('handles single entry (API returns object instead of array)', async () => {
    global.fetch.mockResolvedValueOnce(makeSubsonicOk({
      playlist: {
        id: '11',
        name: 'One Song',
        entry: { id: '200', title: 'Only Track', artist: 'Solo', duration: 200, bitRate: 128 },
      },
    }));

    const result = await getPlaylist('11');
    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0].navSongId).toBe('200');
  });

  test('handles playlist with no entries', async () => {
    global.fetch.mockResolvedValueOnce(makeSubsonicOk({
      playlist: { id: '12', name: 'Empty', entry: [] },
    }));

    const result = await getPlaylist('12');
    expect(result.tracks).toHaveLength(0);
  });
});

describe('navidrome.buildStreamUrl', () => {
  test('includes songId and auth params in URL', () => {
    const url = buildStreamUrl('999');
    expect(url).toContain('http://localhost:4533/rest/stream.view');
    expect(url).toContain('id=999');
    expect(url).toContain('u=admin');
  });

  test('generates a fresh token on each call (salt changes)', () => {
    const url1 = buildStreamUrl('1');
    const url2 = buildStreamUrl('1');
    const salt1 = new URL(url1).searchParams.get('s');
    const salt2 = new URL(url2).searchParams.get('s');
    expect(salt1).not.toBe(salt2);
  });
});
