#!/usr/bin/env node
import { OpsAI } from '../client.js';
type CliResult = {
    code: number;
    output?: any;
    error?: string;
};
export declare function runCli(args?: string[], client?: OpsAI): Promise<CliResult>;
export {};
//# sourceMappingURL=index.d.ts.map