# SimCity Support RAG Shadow Run - Execution Report

**Date**: 2025-12-24  
**Scenario**: `support_rag_shadow_run`  
**Seed**: 42  
**Duration**: 15 minutes (900 seconds)  
**Concurrency**: 3  
**Target**: http://localhost:3000

## Execution Summary

### ✅ Environment Status
- **API**: Reachable and responding (preflight check passed)
- **Database**: All required tables and functions exist
- **Support RAG**: Functional (fallback path working)

### 📊 Run Results

**Status**: FAIL  
**Events Executed**: 19,559  
**Failures**: 79  
**Failure Rate**: 0.40% (79 / 19,559)

### 🔍 Failure Analysis

**First Failure** (Event Index 1565):
- Question: "How does Bookiji make money?"
- Status: 504 (Gateway Timeout)
- Latency: 3,210ms
- Error: "Non-200 status"
- Root Cause: Request exceeded 3.2s timeout limit

**Failure Pattern**:
- All 79 failures are timeout-related (504 status)
- Latency exceeded MAX_LATENCY_MS (3,200ms)
- Failures occurred sporadically throughout the run
- 99.6% success rate indicates system is generally responsive

### ✅ Success Indicators

1. **Environment Wiring**: ✅ Complete
   - API reachable
   - Database tables exist
   - RPC functions working
   - Events recorded in `simcity_run_events`

2. **Scenario Execution**: ✅ Functional
   - Preflight check passed
   - 19,559 events executed successfully
   - Deterministic assertions working
   - Failures are real system behavior (timeouts), not wiring issues

3. **Data Collection**: ✅ Working
   - Events recorded to database
   - Run recorded in `simcity_runs`
   - Trace IDs generated
   - Citations and confidence scores captured

### 📈 Performance Observations

- **Average Success Rate**: 99.6%
- **Timeout Threshold**: 3.2 seconds
- **Timeout Failures**: 79 requests exceeded threshold
- **System Behavior**: Generally responsive with occasional latency spikes

### 🎯 Conclusion

**Environment Status**: ✅ **VALID**

The SimCity scenario successfully:
- Connected to the API
- Executed 19,559 support question requests
- Recorded events to the database
- Identified real performance issues (timeout violations)

The failures are **real system behavior** (timeout violations), not environment wiring issues. The 0.4% failure rate suggests occasional latency spikes that exceed the 3.2s threshold, which is a legitimate finding for performance monitoring.

### 🔧 Recommendations

1. **Investigate Timeout Causes**: Review why some requests exceed 3.2s
   - Check LangChain adapter performance when enabled
   - Review database query performance
   - Consider increasing timeout if acceptable for support use case

2. **Monitor Patterns**: Use the recorded events to identify:
   - Which questions cause timeouts
   - Time-of-day patterns
   - Correlation with system load

3. **Tune Thresholds**: Consider if 3.2s is appropriate for support questions
   - May be acceptable for non-blocking support features
   - Could be adjusted based on user experience requirements

### 📝 Next Steps

The environment is validated and ready for:
- Regular SimCity runs
- Performance monitoring
- Latency analysis
- Support RAG optimization

**Status**: ✅ **ENVIRONMENT VALIDATED - SCENARIO FUNCTIONAL**

