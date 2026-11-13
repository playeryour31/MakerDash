const chalk = require('chalk');
const util = require('util');

const COLORS = {
  maker: '#0d9488',
  api: '#2563eb',
  web: '#7c3aed',
  bot: '#0d9488',
};

/** Turn any mix of strings, Errors and objects into one readable line. */
function format(args) {
  return args
    .map((arg) => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return arg.stack || arg.message;
      return util.inspect(arg, { depth: 4, breakLength: 120 });
    })
    .join(' ');
}

function createLogger(scope = 'Main') {
  const color = COLORS[scope] || '#64748b';
  const tag = chalk.bgHex(color).white.bold(` ${scope} `);

  return {
    info: (...args) => {
      console.log(`${tag} ${format(args)}`);
    },
    success: (...args) => {
      console.log(`${tag} ${chalk.green('✓')} ${format(args)}`);
    },
    warn: (...args) => {
      console.log(`${tag} ${chalk.yellow('!')} ${format(args)}`);
    },
    error: (...args) => {
      console.error(`${tag} ${chalk.red('✗')} ${format(args)}`);
    },
    line: (label, value) => {
      console.log(`${tag} ${chalk.gray(label.padEnd(10))} ${value}`);
    },
  };
}

module.exports = { createLogger };
