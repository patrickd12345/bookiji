
const fs = require('fs');
const content = fs.readFileSync('lint-results.json', 'utf8');
const results = JSON.parse(content);
console.log(JSON.stringify(results[0], null, 2));

