# k6 Installation and Stress Test Execution Report

## EXECUTION STATUS: ✅ COMPLETE

## ARTIFACTS PRODUCED

### k6 Installation
- ✅ k6 v1.4.2 installed via Scoop
- ✅ k6 available in PATH
- ✅ `k6 version` succeeds

### Test Execution
- ✅ `loadtests/booking-flow.k6.js` executed
- ✅ `loadtests/vendor-load.k6.js` executed
- ✅ Tests ran to completion against real service

### Test Results

#### Booking Flow Load Test
- **Total Requests**: 1,113
- **Error Rate**: 33.96%
- **P95 Latency**: 21,984.04ms
- **Status**: Thresholds exceeded (error rate > 1%, latency > 500ms)
- **Execution**: Completed 371 iterations across 2m03s

#### Vendor Load Test
- **Total Requests**: 777
- **Error Rate**: 100.00%
- **P95 Latency**: 1.84s
- **Status**: Thresholds exceeded (error rate > 1%, latency > 500ms)
- **Execution**: Completed 259 iterations across 2m03s

## FAILURES

### Test Threshold Failures
1. **Booking Flow**: Error rate 33.96% (threshold: <1%), P95 latency 21.9s (threshold: <500ms)
2. **Vendor Load**: Error rate 100% (threshold: <1%), P95 latency 1.84s (threshold: <500ms)

### Service Performance Issues
- Connection errors observed: "An existing connection was forcibly closed by the remote host"
- Service unable to handle concurrent load (100 VUs for booking, 20 VUs for vendor)
- HTTP request failures indicate service capacity limits

## FINAL VERDICT: ✅ EXECUTION COMPLETE - PERFORMANCE ISSUES DETECTED

**k6 installed successfully. Stress test harness executed against real DB-backed service. Tests completed but revealed service performance limitations under load.**

## ONE-LINE SUMMARY

**k6 installed via Scoop, stress tests executed successfully, service performance issues detected under load (33-100% error rates, high latency).**
