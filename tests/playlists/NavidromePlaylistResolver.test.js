jest.mock('../../src/music/sources/navidrome', () => ({
  getPlaylists: jest.fn(),
  getPlaylist: jest.fn(),
  search: jest.fn(),
  buildStreamUrl: jest.fn(),
}));

const resolver = require('../../src/music/playlists/NavidromePlaylistResolver');
const { getPlaylists, getPlaylist } = require('../../src/music/sources/navidrome');

afterEach(() => {
  jest.clearAllMocks();
});

describe('NavidromePlaylistResolver.resolve', () => {
  test('throws when query is empty', async () => {
    await expect(resolver.resolve('nav:pl:')).rejects.toThrow();
  });

  test('resolves by numeric ID directly without calling getPlaylists', async () => {
    getPlaylist.mockResolvedValueOnce({ name: 'My Playlist', tracks: [] });
    await resolver.resolve('nav:pl:42');
    expect(getPlaylist).toHaveBeenCalledWith('42');
    expect(getPlaylists).not.toHaveBeenCalled();
  });

  test('resolves by name using substring match', async () => {
    getPlaylists.mockResolvedValueOnce([
      { id: '10', name: 'Favoritos', songCount: 5 },
      { id: '11', name: 'Rock Mix', songCount: 8 },
    ]);
    getPlaylist.mockResolvedValueOnce({ name: 'Favoritos', tracks: [] });

    await resolver.resolve('nav:pl:favor');
    expect(getPlaylists).toHaveBeenCalled();
    expect(getPlaylist).toHaveBeenCalledWith('10');
  });

  test('name match is case-insensitive', async () => {
    getPlaylists.mockResolvedValueOnce([{ id: '20', name: 'Jazz Classics', songCount: 3 }]);
    getPlaylist.mockResolvedValueOnce({ name: 'Jazz Classics', tracks: [] });

    await resolver.resolve('nav:pl:JAZZ');
    expect(getPlaylist).toHaveBeenCalledWith('20');
  });

  test('throws with available playlist names when no match found', async () => {
    getPlaylists.mockResolvedValueOnce([
      { id: '10', name: 'Favoritos', songCount: 5 },
    ]);

    await expect(resolver.resolve('nav:pl:nonexistent')).rejects.toThrow(/nonexistent/);
  });

  test('returns the playlist object from getPlaylist', async () => {
    const expected = {
      name: 'Rock Mix',
      tracks: [{ title: 'Track 1 — Artist', navSongId: '1', source: 'navidrome', duration: 200, thumbnail: null, quality: null }],
    };
    getPlaylists.mockResolvedValueOnce([{ id: '11', name: 'Rock Mix', songCount: 1 }]);
    getPlaylist.mockResolvedValueOnce(expected);

    const result = await resolver.resolve('nav:pl:Rock');
    expect(result).toEqual(expected);
  });
});
