const ytResolver = require('../../src/music/playlists/YoutubePlaylistResolver');
const navResolver = require('../../src/music/playlists/NavidromePlaylistResolver');
const { getResolver } = require('../../src/music/playlists/index');

describe('YoutubePlaylistResolver.canResolve', () => {
  test('matches youtube.com/playlist?list= URL', () => {
    expect(ytResolver.canResolve('https://www.youtube.com/playlist?list=PLabc123')).toBe(true);
  });

  test('matches watch?v=...&list= (video in playlist context)', () => {
    expect(ytResolver.canResolve('https://www.youtube.com/watch?v=abc123&list=PLxxx')).toBe(true);
  });

  test('does NOT match plain YouTube watch URL', () => {
    expect(ytResolver.canResolve('https://www.youtube.com/watch?v=abc123')).toBe(false);
  });

  test('does NOT match youtu.be short URL', () => {
    expect(ytResolver.canResolve('https://youtu.be/abc123')).toBe(false);
  });

  test('does NOT match arbitrary search query', () => {
    expect(ytResolver.canResolve('lo fi hip hop')).toBe(false);
  });

  test('does NOT match Spotify URL', () => {
    expect(ytResolver.canResolve('https://open.spotify.com/track/abc')).toBe(false);
  });
});

describe('NavidromePlaylistResolver.canResolve', () => {
  test('matches nav:pl: prefix', () => {
    expect(navResolver.canResolve('nav:pl:Favoritos')).toBe(true);
  });

  test('matches case-insensitively', () => {
    expect(navResolver.canResolve('NAV:PL:Rock Mix')).toBe(true);
  });

  test('matches numeric ID', () => {
    expect(navResolver.canResolve('nav:pl:42')).toBe(true);
  });

  test('does NOT match nav: search (single track)', () => {
    expect(navResolver.canResolve('nav:bohemian rhapsody')).toBe(false);
  });

  test('does NOT match arbitrary search query', () => {
    expect(navResolver.canResolve('lo fi hip hop')).toBe(false);
  });

  test('does NOT match YouTube playlist URL', () => {
    expect(navResolver.canResolve('https://www.youtube.com/playlist?list=PLabc')).toBe(false);
  });
});

describe('getResolver factory', () => {
  test('returns YoutubePlaylistResolver for YouTube playlist URL', () => {
    expect(getResolver('https://www.youtube.com/playlist?list=PLabc')).toBe(ytResolver);
  });

  test('returns NavidromePlaylistResolver for nav:pl: input', () => {
    expect(getResolver('nav:pl:Rock Mix')).toBe(navResolver);
  });

  test('returns null for single track search query', () => {
    expect(getResolver('lo fi hip hop')).toBeNull();
  });

  test('returns null for nav: search (single track)', () => {
    expect(getResolver('nav:jazz')).toBeNull();
  });

  test('returns null for Spotify track URL', () => {
    expect(getResolver('https://open.spotify.com/track/abc123')).toBeNull();
  });

  test('returns null for plain YouTube video URL', () => {
    expect(getResolver('https://www.youtube.com/watch?v=abc123')).toBeNull();
  });

  test('returns YoutubePlaylistResolver for watch?v=...&list= URL', () => {
    expect(getResolver('https://www.youtube.com/watch?v=abc&list=PLxxx')).toBe(ytResolver);
  });
});
