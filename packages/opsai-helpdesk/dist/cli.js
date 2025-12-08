import fs from 'fs/promises';
import { analyzeMetrics, diagnose, recommendActions } from './engine.js';
export async function runHelpdeskCli(args) {
    const [command, target] = args;
    switch (command) {
        case 'diagnose': {
            const content = target && target !== '-'
                ? await fs.readFile(target, 'utf8').catch(() => '')
                : '';
            const result = diagnose(content || 'No log provided');
            console.log(JSON.stringify(result, null, 2));
            return { code: 0, output: result };
        }
        case 'recommend': {
            const actions = recommendActions();
            console.log(actions.join('\n'));
            return { code: 0, output: actions };
        }
        case 'analyze-metrics': {
            const parsed = target ? JSON.parse(await fs.readFile(target, 'utf8')) : {};
            const result = analyzeMetrics(parsed);
            console.log(JSON.stringify(result, null, 2));
            return { code: 0, output: result };
        }
        default:
            console.log(`helpdesk commands:
  diagnose <path>        Analyze an error log
  recommend              Suggest remediation steps
  analyze-metrics <path> Inspect metrics JSON`);
            return { code: 1 };
    }
}
