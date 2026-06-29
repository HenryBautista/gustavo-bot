const youtubeResolver = require('./YoutubePlaylistResolver');
const navidromeResolver = require('./NavidromePlaylistResolver');

// Add new resolvers here (e.g. SpotifyPlaylistResolver) without touching play.js
const resolvers = [youtubeResolver, navidromeResolver];

function getResolver(input) {
  return resolvers.find((r) => r.canResolve(input)) ?? null;
}

module.exports = { getResolver };
