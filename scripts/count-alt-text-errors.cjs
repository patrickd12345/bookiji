
const fs = require('fs');
const results = JSON.parse(fs.readFileSync('lint-results-2.json', 'utf8'));

let count = 0;
results.forEach(r => {
    r.messages.forEach(m => {
        if (m.ruleId === 'jsx-a11y/alt-text') {
            console.log(`${r.filePath}:${m.line}`);
            count++;
        }
    });
});
console.log(`Total: ${count}`);

