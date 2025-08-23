# 🏙️ Bookiji SimCity Testing Engine

## Overview

The SimCity Testing Engine transforms Bookiji's staging environment into a **persistent simulation sandbox** where synthetic citizens (customers & vendors) interact at fast-forward speed. Instead of static test cases, it creates **emergent behavior** through autonomous agents, providing real-time stress testing and performance monitoring.

## 🎯 Purpose

- **Stress Testing**: Simulate realistic user loads and behaviors
- **Emergent Behavior**: Discover edge cases through autonomous agent interactions
- **Performance Monitoring**: Real-time KPI tracking and bottleneck identification
- **Regression Testing**: Continuous validation of system stability
- **Load Testing**: Understand system behavior under various user patterns

## 🏗️ Architecture

### Core Components

#### 1. **Orchestrator** (`/src/lib/simcity/orchestrator.ts`)
- **World Clock**: Advances simulated time (3s real = 10m sim)
- **Agent Spawning**: Probabilistically creates customers and vendors
- **Event Management**: Coordinates all simulation activities
- **Policy Control**: Manages simulation parameters in real-time

#### 2. **Agents** (`/src/lib/simcity/agent.ts`)
- **Customer Agents**: Search → Select → Book → Reschedule/Cancel → Chat
- **Vendor Agents**: Inbox → Accept/Decline → Propose Time → Chat
- **Persona System**: Chatty/Quiet, Patient/Impatient, Strict/Flexible
- **Behavioral AI**: Decision-making based on personality traits

#### 3. **Telemetry** (`/src/lib/simcity/telemetry.ts`)
- **Metrics Collection**: Bookings, reschedules, cancellations, chat volume
- **Performance Tracking**: Response times, throughput, error rates
- **Event Logging**: Complete audit trail of all activities

#### 4. **API Layer** (`/src/app/api/simcity/`)
- **Status**: Current simulation state and metrics
- **Start/Stop**: Control simulation lifecycle
- **Policies**: Real-time parameter adjustment
- **Events**: Server-Sent Events for live monitoring

#### 5. **Dashboard** (`/src/app/admin/simcity/`)
- **Real-time Controls**: Start, stop, pause simulation
- **Live KPIs**: Bookings, agents, revenue, completion rates
- **Policy Sliders**: Adjust simulation parameters on-the-fly
- **Event Stream**: Live feed of agent activities

## 🚀 Getting Started

### 1. Access the Dashboard

Navigate to `/admin/simcity` in your browser (admin access required).

### 2. Start Simulation

Click the **Start Simulation** button to begin the synthetic world.

### 3. Monitor Activity

Watch as synthetic citizens spawn and interact with Bookiji:
- **Customers** search for services, book appointments, reschedule, cancel
- **Vendors** respond to requests, accept/decline bookings, propose alternatives
- **Chat interactions** between parties
- **Real-time metrics** updating continuously

### 4. Adjust Parameters

Use the policy sliders to modify simulation behavior:
- **Reschedule Chance**: 0-100% probability of booking changes
- **Cancel Chance**: 0-100% probability of cancellations
- **Spawn Rates**: Control how quickly agents appear
- **Tick Speed**: Adjust simulation time acceleration

## 📊 Key Metrics

### Business Metrics
- **Bookings Created**: Total successful appointments
- **Completion Rate**: % of bookings that weren't cancelled
- **Revenue**: $1 skin fees collected per booking
- **Throughput**: Agents spawned per minute

### Performance Metrics
- **Active Agents**: Current live synthetic users
- **Vendor Response Time**: Average time to accept/decline
- **Error Count**: Failed agent operations
- **Chat Volume**: Total messages exchanged

### Behavioral Metrics
- **Reschedule Rate**: % of bookings that changed times
- **Cancel Rate**: % of bookings that were cancelled
- **Patience Breaches**: Customer timeout violations
- **Agent Success Rate**: % of agents completing their flows

## ⚙️ Configuration

### Default Policies

```typescript
{
  skinFee: 1.00,                    // $1 commitment fee
  refundsEnabled: true,             // Allow refunds
  vendorOpenHours: { start: 8, end: 18 }, // Business hours
  customerPatienceThreshold: 10,    // Ticks before timeout
  rescheduleChance: 0.35,          // 35% reschedule probability
  cancelChance: 0.15,              // 15% cancellation probability
  maxConcurrentAgents: 50,         // Maximum live agents
  tickSpeedMs: 3000,               // 3 seconds per tick
  minutesPerTick: 10,              // 10 minutes advance per tick
  customerSpawnRate: 0.3,          // 30% spawn chance per tick
  vendorSpawnRate: 0.1             // 10% spawn chance per tick
}
```

### Customization

All policies can be adjusted in real-time through the dashboard or API:

```bash
POST /api/simcity/policies
{
  "policies": {
    "rescheduleChance": 0.5,
    "cancelChance": 0.25,
    "maxConcurrentAgents": 100
  }
}
```

## 🔧 API Reference

### Status
```bash
GET /api/simcity/status
# Returns current simulation state, metrics, and uptime
```

### Control
```bash
POST /api/simcity/start   # Start simulation
POST /api/simcity/stop    # Stop simulation
```

### Policies
```bash
POST /api/simcity/policies
# Update simulation parameters
```

### Events
```bash
GET /api/simcity/events
# Server-Sent Events stream for real-time monitoring
```

## 🧪 Testing Scenarios

### 1. **High Load Testing**
- Increase `maxConcurrentAgents` to 100+
- Lower `tickSpeedMs` for faster simulation
- Monitor system performance under stress

### 2. **Behavioral Testing**
- Set `rescheduleChance` to 0.8 for frequent changes
- Increase `cancelChance` to test cancellation flows
- Adjust `customerPatienceThreshold` for timeout testing

### 3. **Business Hours Testing**
- Modify `vendorOpenHours` to test off-hours behavior
- Adjust `vendorSpawnRate` to simulate vendor availability

### 4. **Edge Case Discovery**
- Run simulation for extended periods
- Watch for unexpected agent interactions
- Monitor error rates and failure patterns

## 🛡️ Safety Features

### Staging-Only
- **Never targets production**
- **Synthetic user namespace**: `synthetic+id@example.com`
- **Test authentication endpoint**: `/api/test/login`

### Resource Limits
- **Maximum concurrent agents**: Configurable cap
- **Agent step limits**: Prevents infinite loops
- **Memory monitoring**: Automatic cleanup

### Data Isolation
- **Synthetic user flag**: Database separation
- **Nightly cleanup**: Automatic data purging
- **Test environment**: Isolated from real users

## 📈 Use Cases

### Development
- **Feature Testing**: Validate new functionality under load
- **Regression Testing**: Ensure changes don't break existing flows
- **Performance Optimization**: Identify bottlenecks and optimize

### QA
- **Load Testing**: Understand system limits
- **Stress Testing**: Find breaking points
- **Behavioral Testing**: Discover edge cases

### Operations
- **Capacity Planning**: Understand resource requirements
- **Monitoring**: Real-time system health
- **Alerting**: Proactive issue detection

## 🚨 Troubleshooting

### Common Issues

#### Simulation Won't Start
- Check admin permissions
- Verify database connectivity
- Review server logs for errors

#### High Error Rates
- Reduce `maxConcurrentAgents`
- Increase `tickSpeedMs` for slower simulation
- Check system resources

#### Dashboard Not Updating
- Verify EventSource connection
- Check browser console for errors
- Ensure simulation is running

### Debug Mode

Enable detailed logging by setting environment variables:
```bash
DEBUG=simcity:* npm run dev
```

## 🔮 Future Enhancements

### Planned Features
- **AI-Powered Agents**: GPT integration for realistic conversations
- **Playwright Integration**: Real browser automation
- **Advanced Metrics**: Conversion funnels, user journey analysis
- **Scenario Builder**: Predefined test scenarios
- **Performance Profiling**: Detailed bottleneck analysis

### Integration Points
- **Monitoring Systems**: Prometheus, Grafana
- **Alerting**: Slack, PagerDuty
- **Analytics**: Mixpanel, Amplitude
- **Testing**: Jest, Playwright

## 📚 Additional Resources

- **Architecture Diagrams**: See `/docs/architecture/`
- **API Documentation**: `/docs/api/`
- **Testing Guide**: `/docs/testing/`
- **Performance Benchmarks**: `/docs/performance/`

---

## 🎉 Getting Help

- **Documentation**: This guide and inline code comments
- **Issues**: GitHub issues with `simcity` label
- **Discussions**: GitHub discussions for questions
- **Contributing**: See `/CONTRIBUTING.md` for development guidelines

---

*The SimCity Testing Engine transforms static testing into a living, breathing simulation of your platform's real-world usage patterns.*


