
const fs = require('fs');
const results = JSON.parse(fs.readFileSync('lint-results-4.json', 'utf8'));

let fixedCount = 0;

results.forEach(fileResult => {
    const filePath = fileResult.filePath;
    if (!fileResult.messages || fileResult.messages.length === 0) return;

    // Filter relevant messages
    const messages = fileResult.messages.filter(m => 
        m.ruleId === 'react/jsx-no-comment-textnodes'
    );

    if (messages.length === 0) return;

    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;

    // Sort descending
    messages.sort((a, b) => b.line - a.line);

    messages.forEach(msg => {
        // Check current line and next line for the comment
        [0, 1].forEach(offset => {
            const lineIndex = msg.line - 1 + offset;
            if (lineIndex >= lines.length) return;
            
            let line = lines[lineIndex];
            if (line.trim().startsWith('// eslint-disable-next-line')) {
                const match = line.match(/^(\s*)(\/\/.*)$/);
                if (match) {
                    const indent = match[1];
                    const comment = match[2];
                    lines[lineIndex] = `${indent}{/* ${comment.replace('// ', '')} */}`;
                    modified = true;
                    fixedCount++;
                }
            }
        });
    });

    if (modified) {
        fs.writeFileSync(filePath, lines.join('\n'));
        console.log(`Fixed JSX comments in ${filePath}`);
    }
});

console.log(`Total fixed: ${fixedCount}`);
