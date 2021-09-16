const fs = require('fs');
const swPath = process.argv[process.argv.length - 1];

const swContent = fs.readFileSync(swPath, 'utf-8');

// here we update the version
let newVersion;
const newSwContent = swContent.replace(/const[ ]+version[ ]+=[ ]+[0-9]+[;]*/, (a, b, c) => {
  const oldVersion = a.match(/[0-9]+/)[0];
  newVersion = parseInt(oldVersion) + 1;
  return `const version = ${newVersion};`;
});

fs.writeFileSync(swPath, newSwContent);

console.log('newVersion', newVersion);
