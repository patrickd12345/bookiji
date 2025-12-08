export type SelfHealingAction = 'restartComponent' | 'flushCache' | 'resetDeploymentPointers';
export type SelfHealingResult = {
    action: SelfHealingAction;
    target?: string;
    status: 'completed' | 'skipped';
    detail: string;
    timestamp: string;
};
export declare function restartComponent(component: 'api' | 'worker' | 'scheduler'): SelfHealingResult;
export declare function flushCache(): SelfHealingResult;
export declare function resetDeploymentPointers(): SelfHealingResult;
