import { predictBookingThroughput, predictHealthTrend } from './predict.js';
import { autoGenerateIncidents } from './incidents.js';
import { flushCache } from './actions.js';
export type SyntheticReport = {
    summary: {
        healthScore: number;
        bookings: number;
        deployments: number;
    };
    predictions: {
        health: ReturnType<typeof predictHealthTrend>;
        bookings: ReturnType<typeof predictBookingThroughput>;
    };
    incidents: ReturnType<typeof autoGenerateIncidents>;
    actions: Array<ReturnType<typeof flushCache>>;
};
export declare function runSyntheticCheck(): SyntheticReport;
