// Returns { args: string[], flags: Set<string> }
// e.g. ['nav:pl:rock', '--shuffle'] → { args: ['nav:pl:rock'], flags: Set { 'shuffle' } }
function parseFlags(args) {
  const flags = new Set();
  const clean = args.filter((a) => {
    if (a.startsWith('--')) {
      flags.add(a.slice(2).toLowerCase());
      return false;
    }
    return true;
  });
  return { args: clean, flags };
}

module.exports = { parseFlags };
