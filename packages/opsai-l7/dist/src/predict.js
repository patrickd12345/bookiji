export function predictHealthTrend(series) {
    if (!series || series.length < 2) {
        return { trend: 'steady', confidence: 0.2, nextEstimate: 0 };
    }
    const latest = series[series.length - 1];
    const previous = series[series.length - 2];
    const delta = latest - previous;
    const trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'steady';
    const confidence = Math.min(1, Math.abs(delta) / (latest || 1));
    const nextEstimate = Math.max(0, latest + delta * 0.6);
    return { trend, confidence: Number(confidence.toFixed(2)), nextEstimate };
}
export function predictBookingThroughput(samples) {
    if (!samples || samples.length < 2) {
        return { trend: 'steady', confidence: 0.2, nextEstimate: samples?.[0]?.value || 0 };
    }
    const sorted = [...samples].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const first = sorted[0].value;
    const last = sorted[sorted.length - 1].value;
    const delta = last - first;
    const trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'steady';
    const confidence = Math.min(1, Math.abs(delta) / (Math.abs(first) + 1));
    const nextEstimate = Math.max(0, last + delta * 0.5);
    return { trend, confidence: Number(confidence.toFixed(2)), nextEstimate };
}
export function detectMetricShift(current, baseline) {
    if (baseline === 0) {
        return { shift: 0, severity: 'low' };
    }
    const shift = (current - baseline) / baseline;
    const severity = Math.abs(shift) > 0.3 ? 'high' : Math.abs(shift) > 0.15 ? 'medium' : 'low';
    return { shift, severity };
}
