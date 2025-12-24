
const fs = require('fs');
const results = JSON.parse(fs.readFileSync('lint-results-4.json', 'utf8'));

let count = 0;
results.forEach(r => {
    r.messages.forEach(m => {
        console.log(`${r.filePath}:${m.line} [${m.ruleId}] ${m.message}`);
        count++;
    });
});
console.log(`Total remaining: ${count}`);

