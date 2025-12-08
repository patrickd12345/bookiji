import { predictBookingThroughput, predictHealthTrend } from './predict';
import { autoGenerateIncidents } from './incidents';
import { flushCache, resetDeploymentPointers, restartComponent } from './actions';
export function runSyntheticCheck() {
    const healthSamples = [0.9, 0.8, 0.72];
    const bookingSamples = [
        { timestamp: new Date(Date.now() - 3600 * 1000).toISOString(), value: 120 },
        { timestamp: new Date().toISOString(), value: 82 }
    ];
    const predictions = {
        health: predictHealthTrend(healthSamples),
        bookings: predictBookingThroughput(bookingSamples)
    };
    const incidents = autoGenerateIncidents({
        healthScores: healthSamples,
        bookingBaseline: bookingSamples[0].value,
        bookingCurrent: bookingSamples[1].value,
        anomalies: predictions.bookings.trend === 'down' ? ['Booking drop detected'] : []
    });
    const actions = [
        restartComponent('api'),
        flushCache(),
        resetDeploymentPointers()
    ];
    return {
        summary: {
            healthScore: healthSamples.slice(-1)[0],
            bookings: bookingSamples[1].value,
            deployments: 0
        },
        predictions,
        incidents,
        actions
    };
}
