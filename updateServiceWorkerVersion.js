const fs = require('fs');
const swPath = process.argv[process.argv.length - 1];

const swContent = fs.readFileSync(swPath, 'utf-8');

// here we update the version
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const packageName = packageJson.name;
let packageNewVersion = packageJson.version;
const [major, minor, patch] = packageJson.version.split('.');
packageNewVersion = `${major}.${minor}.${patch}-${Date.now()}`;

const newCacheName = `${packageName}-${packageNewVersion}`;

const newSwContent = swContent.replace(
  /const[ ]+CACHE_NAME[ ]+=[ ]+[`0-9a-z-${}'.]+[;]*/,
  (a, b, c) => {
    return `const CACHE_NAME = '${newCacheName}';`;
  },
);

// update service worker
fs.writeFileSync(swPath, newSwContent);

console.log('newCacheName', newCacheName);
