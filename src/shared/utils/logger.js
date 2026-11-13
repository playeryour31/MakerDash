const chalk = require('chalk');

const COLORS = {
  maker: '#0d9488',
  api: '#2563eb',
  web: '#7c3aed',
  bot: '#0d9488',
};

function createLogger(scope = 'Main') {
  const color = COLORS[scope] || '#64748b';
  const tag = chalk.bgHex(color).white.bold(` ${scope} `);

  return {
    info: (msg, extra) => {
      console.log(`${tag} ${msg}${extra ? chalk.gray(` ${extra}`) : ''}`);
    },
    success: (msg, extra) => {
      console.log(`${tag} ${chalk.green('✓')} ${msg}${extra ? chalk.gray(` ${extra}`) : ''}`);
    },
    warn: (msg, extra) => {
      console.log(`${tag} ${chalk.yellow('!')} ${msg}${extra ? chalk.gray(` ${extra}`) : ''}`);
    },
    error: (msg, extra) => {
      console.error(`${tag} ${chalk.red('✗')} ${msg}${extra ? chalk.gray(` ${extra}`) : ''}`);
    },
    line: (label, value) => {
      console.log(`${tag} ${chalk.gray(label.padEnd(10))} ${value}`);
    },
  };
}

module.exports = { createLogger };
