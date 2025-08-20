# Provider Availability System Design

## 🎯 **Overview**

The Bookiji availability system uses **real-time calendar reading** to determine when providers are available for bookings. This approach eliminates the need for database storage of availability slots, ensuring data consistency and eliminating desync issues.

## 🏗️ **Architecture Principles**

### **Core Design Philosophy**
- **Single Source of Truth**: Calendar data (Google Calendar or Bookiji native)
- **Real-Time Reading**: No pre-stored availability slots
- **No Database Caching**: Eliminates stale data and desync risks
- **Simple & Reliable**: Works or doesn't work, no in-between states

### **Why This Approach?**
- ✅ **No Desync**: Calendar is always current
- ✅ **No Stale Data**: Real-time availability
- ✅ **Simple Maintenance**: No complex cache invalidation
- ✅ **Flexible**: Works with existing calendar workflows
- ❌ **Performance**: API calls on every request
- ❌ **Rate Limits**: Google Calendar API quotas

## 📅 **Two Availability Modes**

### **1. Additive Mode**
- **Principle**: Only explicitly marked slots are available
- **Implementation**: Events titled `/BOOKIJI/` become bookable
- **Use Case**: Providers who want granular control over availability
- **Example**: Mark specific 2-hour blocks as available

### **2. Subtractive Mode**
- **Principle**: All free time within business hours is available
- **Implementation**: Any free slot becomes bookable
- **Use Case**: Providers who want to offer all available time
- **Example**: Business hours 9 AM - 5 PM, all free slots bookable

## 🔄 **Calendar Integration**

### **Google Calendar (OAuth2)**
- **Sync Frequency**: Every 5 minutes
- **Real-Time Updates**: Changes immediately reflect in availability
- **API Endpoint**: `/api/availability/google-calendar`
- **Token Management**: Encrypted storage, automatic refresh

### **Bookiji Native Calendar**
- **Built-in System**: No external dependencies
- **Real-Time Updates**: Immediate availability changes
- **Simple Setup**: Perfect for getting started quickly

## 🎯 **Availability Resolution Flow**

### **Customer Search Request**
```
1. Customer: "Available slots on Wednesday 2-4 PM"
2. System: Query provider's calendar for that time range
3. System: Check business hours (e.g., 9 AM - 5 PM)
4. System: Apply availability mode:
   - Additive: Look for `/BOOKIJI/` events
   - Subtractive: Look for free slots
5. System: Return available time ranges
```

### **Real-Time Calendar Query**
- **No Caching**: Always fresh data
- **Direct API Call**: Google Calendar or Bookiji native
- **Business Hours Filter**: Enforced at query time
- **Availability Mode Logic**: Applied in real-time

## 🚫 **What We DON'T Do**

### **Database Storage of Slots**
- ❌ No `availability_slots` table
- ❌ No pre-generated time slots
- ❌ No periodic calendar scanning
- ❌ No background slot generation

### **Caching Strategies**
- ❌ No availability data caching
- ❌ No slot result caching
- ❌ No time-range caching
- ❌ No hybrid approaches

## 🔧 **Implementation Details**

### **API Endpoints**
```
GET /api/availability/{providerId}
POST /api/availability/search
GET /api/availability/google-calendar/sync
```

### **Calendar Query Logic**
```typescript
interface AvailabilityQuery {
  providerId: string;
  startTime: Date;
  endTime: Date;
  mode: 'additive' | 'subtractive';
}

interface AvailabilityResult {
  availableSlots: TimeRange[];
  businessHours: TimeRange;
  lastUpdated: Date;
}
```

### **Business Hours Enforcement**
- **Provider Schedule**: Days and hours of operation
- **Time Zone**: Provider's local time zone
- **Validation**: All bookings must be within business hours
- **Flexibility**: Multiple time ranges per day supported

## 📊 **Performance Considerations**

### **Current Limitations**
- **API Calls**: Every availability request = calendar query
- **Response Time**: Depends on calendar service performance
- **Rate Limits**: Google Calendar API quotas
- **No Indexing**: Can't optimize search queries

### **Mitigation Strategies**
- **Request Batching**: Get week/month of data at once
- **Smart Queries**: Only fetch necessary time ranges
- **Error Handling**: Graceful fallbacks for API failures
- **Monitoring**: Track API usage and performance

## 🚀 **Future Enhancements**

### **Phase 1: Performance Optimization**
- **Request Batching**: Optimize calendar queries
- **Error Handling**: Better fallback strategies
- **Monitoring**: Performance metrics and alerts

### **Phase 2: Advanced Features**
- **Recurring Availability**: Weekly/monthly patterns
- **Block Time**: Provider can block specific dates
- **Availability Rules**: Custom business logic
- **Multi-Location**: Different hours per location

## 🧪 **Testing Strategy**

### **Unit Tests**
- **Availability Logic**: Mode-specific calculations
- **Business Hours**: Time range validation
- **Calendar Parsing**: Event extraction and processing

### **Integration Tests**
- **Google Calendar API**: Real API calls in test environment
- **End-to-End**: Complete availability search flow
- **Error Scenarios**: API failures and edge cases

### **Performance Tests**
- **Response Time**: Availability query performance
- **API Limits**: Rate limiting behavior
- **Concurrent Users**: Multiple simultaneous requests

## 📝 **Configuration**

### **Environment Variables**
```bash
# Google Calendar Integration
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=your_redirect_uri

# Calendar Sync Settings
CALENDAR_SYNC_INTERVAL=300000  # 5 minutes
CALENDAR_API_TIMEOUT=10000     # 10 seconds
```

### **Provider Settings**
```typescript
interface ProviderAvailabilityConfig {
  mode: 'additive' | 'subtractive';
  businessHours: BusinessHours;
  timezone: string;
  calendarIntegration: 'google' | 'native';
  syncEnabled: boolean;
}
```

## 🎯 **Success Metrics**

### **Reliability**
- **Uptime**: 99.9% availability
- **Data Freshness**: Real-time calendar data
- **Error Rate**: <1% failed availability queries

### **Performance**
- **Response Time**: <2 seconds for availability queries
- **API Efficiency**: Minimal Google Calendar API calls
- **User Experience**: Fast, responsive availability search

### **Business Impact**
- **Double Bookings**: 0% (eliminated by real-time data)
- **Customer Satisfaction**: High (accurate availability)
- **Provider Efficiency**: Easy calendar management

---

*This design prioritizes **reliability and simplicity** over performance optimization. The real-time approach ensures data consistency and eliminates complex caching issues, making the system more maintainable and trustworthy.*

---

**🏆 Design by:** The one who was NOT sleeping during the availability system discussion! 😅

*"Keep it simple, stupid - no database slots, no caching, just read the calendar when you need it!"* ✨
