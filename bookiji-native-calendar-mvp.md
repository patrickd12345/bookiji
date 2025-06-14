# Bookiji-Native Calendar MVP Spec

## 1. Overview
A simple, mobile-friendly calendar for vendors who do not use Google, Outlook, or Yahoo. Enables them to manage availability and bookings directly in Bookiji.

---

## 2. Features
- Add/edit/delete time slots
- Set recurring availability (e.g., every Monday 9-5)
- Block out time (vacation, lunch, etc.)
- Assign services to slots (e.g., Haircut, Brushing, Transformation)
- View upcoming bookings
- Shareable booking link for customers
- Mobile and desktop friendly

---

## 3. Data Structure
- **Vendor**
  - id
  - name
  - email
- **CalendarSlot**
  - id
  - vendor_id
  - start_time
  - end_time
  - service_type
  - status (available, booked, blocked)
  - recurrence_rule (optional)
- **Booking**
  - id
  - slot_id
  - customer_id
  - status (confirmed, cancelled, no-show)

---

## 4. UI/UX Wireframe (ASCII)

```
+-------------------------------+
| Bookiji Calendar              |
+-------------------------------+
| [Add Slot] [Block Time]       |
+-------------------------------+
| Mon | Tue | Wed | Thu | Fri   |
|-------------------------------|
| 9am  9am  9am  9am  9am      |
| 10am 10am 10am 10am 10am     |
| ...                           |
+-------------------------------+
| [Upcoming Bookings]           |
| - Haircut, Tue 10am           |
| - Brushing, Wed 11am          |
+-------------------------------+
| [Share My Calendar Link]      |
+-------------------------------+
```

---

## 5. Onboarding & Booking Flow
- Vendor selects "Bookiji Calendar" during onboarding.
- Sets up initial availability and services.
- Bookiji displays real-time slots to customers.
- Bookings update the calendar automatically.

---

*This MVP ensures every vendor can use Bookiji, even without an external calendar.* 