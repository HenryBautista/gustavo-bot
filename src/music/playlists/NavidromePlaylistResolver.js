const { getPlaylists, getPlaylist } = require('../sources/navidrome');
const BasePlaylistResolver = require('./BasePlaylistResolver');

class NavidromePlaylistResolver extends BasePlaylistResolver {
  canResolve(input) {
    return input.toLowerCase().startsWith('nav:pl:');
  }

  async resolve(input, options = {}) {
    const query = input.slice('nav:pl:'.length).trim();
    if (!query) throw new Error('Escribe un nombre o ID de playlist. Ej: `g!play nav:pl:Favoritos`');

    if (/^\d+$/.test(query)) {
      return getPlaylist(query);
    }

    const lists = await getPlaylists();
    const q = query.toLowerCase();
    const match = lists.find((pl) => pl.name.toLowerCase().includes(q));
    if (!match) {
      const names = lists.map((pl) => `**${pl.name}**`).join(', ');
      const hint = lists.length ? `Playlists disponibles: ${names}` : 'No hay playlists en Navidrome.';
      throw new Error(`No encontré ninguna playlist con "${query}". ${hint}`);
    }

    console.log(`[NavPlaylist] Match: "${match.name}" (id=${match.id})`);
    return getPlaylist(match.id);
  }
}

module.exports = new NavidromePlaylistResolver();
