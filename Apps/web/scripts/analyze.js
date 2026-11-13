process.env.ANALYZE = 'true';
const { spawnSync } = require('child_process');
const result = spawnSync('npx', ['next', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
  cwd: require('path').join(__dirname, '..'),
});
process.exit(result.status ?? 1);
