const { EventEmitter } = require('events');

const mockSpawn = jest.fn();
jest.mock('child_process', () => ({ spawn: mockSpawn }));

const resolver = require('../../src/music/playlists/YoutubePlaylistResolver');

const PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PLtest123';

function makePlaylistJson(entries = []) {
  return JSON.stringify({
    title: 'Test Playlist',
    entries,
  });
}

function makeProc(stdout = '', exitCode = 0, stderrMsg = '') {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  setImmediate(() => {
    if (stdout) proc.stdout.emit('data', Buffer.from(stdout));
    if (stderrMsg) proc.stderr.emit('data', Buffer.from(stderrMsg));
    proc.emit('close', exitCode);
  });
  return proc;
}

const sampleEntries = [
  { id: 'abc123', title: 'Song A', duration: 180 },
  { id: 'def456', title: 'Song B', duration: 240 },
];

afterEach(() => {
  jest.clearAllMocks();
});

describe('YoutubePlaylistResolver — --playlist-end argument', () => {
  test('resolve(url, { limit: 50 }) passes --playlist-end 50 to spawn', async () => {
    mockSpawn.mockReturnValue(makeProc(makePlaylistJson(sampleEntries)));
    await resolver.resolve(PLAYLIST_URL, { limit: 50 });
    const args = mockSpawn.mock.calls[0][1];
    expect(args).toContain('--playlist-end');
    expect(args[args.indexOf('--playlist-end') + 1]).toBe('50');
  });

  test('resolve(url, { limit: 10 }) passes --playlist-end 10 to spawn', async () => {
    mockSpawn.mockReturnValue(makeProc(makePlaylistJson(sampleEntries)));
    await resolver.resolve(PLAYLIST_URL, { limit: 10 });
    const args = mockSpawn.mock.calls[0][1];
    expect(args[args.indexOf('--playlist-end') + 1]).toBe('10');
  });

  test('resolve(url) without options defaults --playlist-end to 50', async () => {
    mockSpawn.mockReturnValue(makeProc(makePlaylistJson(sampleEntries)));
    await resolver.resolve(PLAYLIST_URL);
    const args = mockSpawn.mock.calls[0][1];
    expect(args[args.indexOf('--playlist-end') + 1]).toBe('50');
  });

  test('resolve(url, {}) with empty options defaults --playlist-end to 50', async () => {
    mockSpawn.mockReturnValue(makeProc(makePlaylistJson(sampleEntries)));
    await resolver.resolve(PLAYLIST_URL, {});
    const args = mockSpawn.mock.calls[0][1];
    expect(args[args.indexOf('--playlist-end') + 1]).toBe('50');
  });

  test('always includes --flat-playlist, -J, --quiet, --no-warnings', async () => {
    mockSpawn.mockReturnValue(makeProc(makePlaylistJson(sampleEntries)));
    await resolver.resolve(PLAYLIST_URL, { limit: 50 });
    const args = mockSpawn.mock.calls[0][1];
    expect(args).toContain('--flat-playlist');
    expect(args).toContain('-J');
    expect(args).toContain('--quiet');
    expect(args).toContain('--no-warnings');
  });
});

describe('YoutubePlaylistResolver — return shape', () => {
  test('returns { name, tracks } with playlist title', async () => {
    mockSpawn.mockReturnValue(makeProc(makePlaylistJson(sampleEntries)));
    const result = await resolver.resolve(PLAYLIST_URL, { limit: 50 });
    expect(result.name).toBe('Test Playlist');
    expect(Array.isArray(result.tracks)).toBe(true);
  });

  test('maps entries to track objects with correct fields', async () => {
    mockSpawn.mockReturnValue(makeProc(makePlaylistJson(sampleEntries)));
    const { tracks } = await resolver.resolve(PLAYLIST_URL, { limit: 50 });
    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toMatchObject({
      title: 'Song A',
      url: 'https://www.youtube.com/watch?v=abc123',
      duration: 180,
      source: 'youtube',
    });
  });

  test('url format is https://www.youtube.com/watch?v=<id>', async () => {
    mockSpawn.mockReturnValue(makeProc(makePlaylistJson([{ id: 'xyz789', title: 'T', duration: 0 }])));
    const { tracks } = await resolver.resolve(PLAYLIST_URL, { limit: 50 });
    expect(tracks[0].url).toBe('https://www.youtube.com/watch?v=xyz789');
  });

  test('source field is youtube', async () => {
    mockSpawn.mockReturnValue(makeProc(makePlaylistJson(sampleEntries)));
    const { tracks } = await resolver.resolve(PLAYLIST_URL, { limit: 50 });
    expect(tracks.every((t) => t.source === 'youtube')).toBe(true);
  });

  test('duration falls back to 0 when entry has no duration', async () => {
    mockSpawn.mockReturnValue(makeProc(makePlaylistJson([{ id: 'abc', title: 'T' }])));
    const { tracks } = await resolver.resolve(PLAYLIST_URL, { limit: 50 });
    expect(tracks[0].duration).toBe(0);
  });

  test("title falls back to 'Sin título' when entry has no title", async () => {
    mockSpawn.mockReturnValue(makeProc(makePlaylistJson([{ id: 'abc', duration: 120 }])));
    const { tracks } = await resolver.resolve(PLAYLIST_URL, { limit: 50 });
    expect(tracks[0].title).toBe('Sin título');
  });
});

describe('YoutubePlaylistResolver — error handling', () => {
  test('rejects when yt-dlp exits with non-zero code', async () => {
    mockSpawn.mockReturnValue(makeProc('', 1, 'some error'));
    await expect(resolver.resolve(PLAYLIST_URL, { limit: 50 })).rejects.toThrow('some error');
  });

  test('rejects with generic message when stderr is empty on non-zero exit', async () => {
    mockSpawn.mockReturnValue(makeProc('', 2, ''));
    await expect(resolver.resolve(PLAYLIST_URL, { limit: 50 })).rejects.toThrow(/yt-dlp salió con código 2/);
  });
});
