const fs = require('fs');
const swPath = process.argv[process.argv.length - 1];

const swContent = fs.readFileSync(swPath, 'utf-8');

// here we update the version
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const packageName = packageJson.name;
let packageNewVersion = packageJson.version;
const [major, minor, patch] = packageJson.version.split('.');
packageNewVersion = `${major}.${minor}.${parseInt(patch) + 1}`;

const newCacheName = `${packageName}-${packageNewVersion}`;

const newSwContent = swContent.replace(/const[ ]+CACHE_NAME[ ]+=[ ]+[`0-9a-z-${}'.]+[;]*/, (a, b, c) => {
  return `const CACHE_NAME = '${newCacheName}';`;
});

// update service worker
fs.writeFileSync(swPath, newSwContent);

// update package.json
fs.writeFileSync(
  'package.json',
  JSON.stringify(
    {
      ...packageJson,
      version: `${packageNewVersion}`,
    },
    null,
    2,
  ),
);

console.log('newCacheName', newCacheName);
