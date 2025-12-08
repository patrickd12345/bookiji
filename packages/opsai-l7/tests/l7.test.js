import { describe, expect, test } from 'vitest';
import { autoGenerateIncidents, flushCache, predictBookingThroughput, predictHealthTrend, resetDeploymentPointers, restartComponent } from '../src';
describe('L7 predictions', () => {
    test('predictHealthTrend detects downward movement', () => {
        const result = predictHealthTrend([0.9, 0.8, 0.6]);
        expect(result.trend).toBe('down');
        expect(result.nextEstimate).toBeGreaterThan(0);
    });
    test('predictBookingThroughput handles slope', () => {
        const now = new Date().toISOString();
        const earlier = new Date(Date.now() - 3600 * 1000).toISOString();
        const result = predictBookingThroughput([
            { timestamp: earlier, value: 120 },
            { timestamp: now, value: 90 }
        ]);
        expect(result.trend).toBe('down');
        expect(result.confidence).toBeGreaterThan(0);
    });
});
describe('Self-healing flow', () => {
    test('runs simulated actions', () => {
        const restart = restartComponent('api');
        const cache = flushCache();
        const reset = resetDeploymentPointers();
        expect(restart.status).toBe('completed');
        expect(cache.detail).toContain('Cache');
        expect(reset.action).toBe('resetDeploymentPointers');
    });
});
describe('Incident auto-filing', () => {
    test('creates incident when bookings deviate', () => {
        const incidents = autoGenerateIncidents({
            bookingBaseline: 100,
            bookingCurrent: 60,
            healthScores: [0.9, 0.7]
        });
        expect(incidents.length).toBeGreaterThan(0);
        expect(incidents[0].status).toBe('open');
    });
});
