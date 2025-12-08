import { detectMetricShift, predictHealthTrend } from './predict';
export function autoGenerateIncidents(context) {
    const incidents = [];
    const healthPrediction = predictHealthTrend(context.healthScores || []);
    if (healthPrediction.trend === 'down' && (context.healthScores?.slice(-1)[0] ?? 1) < 0.5) {
        incidents.push(makeIncident('high', 'Health degradation detected', 'Health score falling'));
    }
    if (context.bookingCurrent != null && context.bookingBaseline != null) {
        const shift = detectMetricShift(context.bookingCurrent, context.bookingBaseline);
        if (shift.severity !== 'low') {
            incidents.push(makeIncident(shift.severity === 'high' ? 'high' : 'medium', 'Booking throughput deviation', `Bookings ${(shift.shift * 100).toFixed(1)}% vs baseline`));
        }
    }
    if (context.anomalies?.length) {
        incidents.push(makeIncident('medium', 'Anomalies detected', context.anomalies.join('; ')));
    }
    return incidents;
}
function makeIncident(severity, title, cause) {
    return {
        id: `inc_${Math.random().toString(16).slice(2)}_${Date.now()}`,
        severity,
        title,
        status: 'open',
        createdAt: new Date().toISOString(),
        cause
    };
}
