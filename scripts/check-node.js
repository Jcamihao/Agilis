const [major, minor] = process.versions.node.split('.').map(Number);

const minimumMajor = 20;
const minimumMinor = 9;

const isSupported =
  major > minimumMajor || (major === minimumMajor && minor >= minimumMinor);

if (!isSupported) {
  console.error(
    [
      '',
      'Agilis requires Node.js 20.9+ and npm 10+.',
      `Current Node.js version: ${process.versions.node}`,
      '',
      'Suggested fix:',
      '1. Switch to Node 20.19.5',
      '2. Reinstall dependencies',
      '',
      'Examples:',
      '  nvm install 20.19.5',
      '  nvm use 20.19.5',
      '  rm -rf node_modules frontend/node_modules',
      '  npm install',
      '',
    ].join('\n'),
  );

  process.exit(1);
}
