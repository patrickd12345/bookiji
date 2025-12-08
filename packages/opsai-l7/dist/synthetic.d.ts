import { predictBookingThroughput, predictHealthTrend } from './predict';
import { autoGenerateIncidents } from './incidents';
import { flushCache } from './actions';
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
