
const fs = require('fs');
const path = require('path');

const results = JSON.parse(fs.readFileSync('lint-results-2.json', 'utf8'));

let fixedCount = 0;

results.forEach(fileResult => {
    const filePath = fileResult.filePath;
    if (!fileResult.messages || fileResult.messages.length === 0) return;

    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;

    // Filter relevant messages
    const messages = fileResult.messages.filter(m => 
        m.ruleId === 'react/no-unescaped-entities'
    );

    if (messages.length === 0) return;

    // Group by line
    const modificationsByLine = new Map();

    messages.forEach(msg => {
        if (!modificationsByLine.has(msg.line)) {
            modificationsByLine.set(msg.line, []);
        }
        modificationsByLine.get(msg.line).push(msg);
    });

    for (const [lineNum, msgs] of modificationsByLine.entries()) {
        const lineIndex = lineNum - 1;
        if (lineIndex < 0 || lineIndex >= lines.length) continue;

        let line = lines[lineIndex];
        
        // Sort by column descending to avoid offset issues
        msgs.sort((a, b) => b.column - a.column);

        msgs.forEach(msg => {
            const colIdx = msg.column - 1;
            const charToReplace = line[colIdx];
            
            let replacement = null;
            if (charToReplace === "'") replacement = "&apos;";
            else if (charToReplace === '"') replacement = "&quot;";
            else if (charToReplace === '>') replacement = "&gt;";
            else if (charToReplace === '}') replacement = "}"; // Usually } in JSX text needs escaping if it looks like expression end? No, usually } is fine unless unmatched.
            
            // The message says: "`'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`."
            if (msg.message.includes("`'`")) replacement = "&apos;";
            if (msg.message.includes('`"`')) replacement = "&quot;";
            if (msg.message.includes('`>`')) replacement = "&gt;";
            if (msg.message.includes('`}`')) replacement = "}"; // Linter usually complains about } ?

            if (replacement && charToReplace) {
                line = line.substring(0, colIdx) + replacement + line.substring(colIdx + 1);
                modified = true;
                fixedCount++;
            }
        });
        
        lines[lineIndex] = line;
    }

    if (modified) {
        fs.writeFileSync(filePath, lines.join('\n'));
        console.log(`Fixed entities in ${filePath}`);
    }
});

console.log(`Total fixed: ${fixedCount}`);

