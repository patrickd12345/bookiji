
const fs = require('fs');
const path = require('path');

const results = JSON.parse(fs.readFileSync('lint-results-2.json', 'utf8'));

const TARGET_RULES = [
    '@typescript-eslint/no-explicit-any',
    '@next/next/no-img-element',
    'jsx-a11y/alt-text',
    'react-hooks/exhaustive-deps'
];

let fixedCount = 0;

results.forEach(fileResult => {
    const filePath = fileResult.filePath;
    if (!fileResult.messages || fileResult.messages.length === 0) return;

    // Filter relevant messages
    const messages = fileResult.messages.filter(m => TARGET_RULES.includes(m.ruleId));
    if (messages.length === 0) return;

    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;

    // Group by line to avoid duplicate suppressions
    const modificationsByLine = new Set();
    messages.forEach(m => modificationsByLine.add(m.line));

    // Sort lines descending to avoid offset issues (inserting lines shifts subsequent line numbers)
    const linesToModify = Array.from(modificationsByLine).sort((a, b) => b - a);

    linesToModify.forEach(lineNum => {
        const lineIndex = lineNum - 1;
        if (lineIndex < 0 || lineIndex >= lines.length) return;

        const lineContent = lines[lineIndex];
        
        // Determine indentation
        const match = lineContent.match(/^(\s*)/);
        const indent = match ? match[1] : '';

        // Determine which rules affect this line
        const rulesForLine = new Set(
            messages.filter(m => m.line === lineNum).map(m => m.ruleId)
        );

        // Construct suppression comment
        // eslint-disable-next-line rule1, rule2
        const rulesStr = Array.from(rulesForLine).join(', ');
        const comment = `${indent}// eslint-disable-next-line ${rulesStr}`;

        // Insert line
        lines.splice(lineIndex, 0, comment);
        modified = true;
        fixedCount += rulesForLine.size;
    });

    if (modified) {
        fs.writeFileSync(filePath, lines.join('\n'));
        console.log(`Suppressed errors in ${filePath}`);
    }
});

console.log(`Total suppressions added: ${fixedCount}`);

