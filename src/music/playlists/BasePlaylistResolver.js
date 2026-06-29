class BasePlaylistResolver {
  canResolve(_input) {
    throw new Error('canResolve() not implemented');
  }

  async resolve(_input) {
    throw new Error('resolve() not implemented');
  }
}

module.exports = BasePlaylistResolver;
