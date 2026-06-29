const { Collection } = require('discord.js');

const commandModules = [
  require('./play'),
  require('./skip'),
  require('./stop'),
  require('./pause'),
  require('./resume'),
  require('./queue'),
  require('./clear'),
  require('./nowplaying'),
  require('./help'),
];

const commands = new Collection();

for (const cmd of commandModules) {
  commands.set(cmd.name, cmd);
  for (const alias of cmd.aliases ?? []) {
    commands.set(alias, cmd);
  }
}

module.exports = commands;
