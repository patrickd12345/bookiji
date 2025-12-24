
const fs = require('fs');
const results = JSON.parse(fs.readFileSync('lint-results-2.json', 'utf8'));

let count = 0;
results.forEach(r => {
    r.messages.forEach(m => {
        if (m.ruleId === '@typescript-eslint/no-explicit-any') {
            count++;
        }
    });
});
console.log(`Total no-explicit-any: ${count}`);

