# 🗄️ Manual Database Setup Guide

## 🚨 **IMMEDIATE ACTION REQUIRED**

Since the Supabase CLI installation failed, we'll set up the database manually through the Supabase Dashboard.

## 📋 **Step-by-Step Instructions**

### **Step 1: Access Your Supabase Dashboard**
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your Bookiji project

### **Step 2: Run the Initial Schema Migration**
1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Click **Run** to execute the migration

### **Step 3: Run the Profiles Migration**
1. Create another **New Query**
2. Copy and paste the entire contents of `supabase/migrations/20240320000000_create_profiles.sql`
3. Click **Run** to execute the migration

### **Step 4: Verify the Setup**
1. Go to **Table Editor** in your dashboard
2. You should see these tables:
   - `profiles`
   - `services`
   - `availability_slots`
   - `bookings`
   - `reviews`
   - `provider_locations`

### **Step 5: Test the Connection**
After running the migrations, test your database:
```bash
curl http://localhost:3000/api/test-database
```

## ✅ **What This Will Give You**

Once the migrations are run, you'll have:
- ✅ Complete database schema
- ✅ Row Level Security policies
- ✅ Proper indexing for performance
- ✅ User authentication tables
- ✅ Booking system tables
- ✅ Service management tables

## 🎯 **Next Steps After Database Setup**

1. **Test the connection** using the API endpoint
2. **Connect your registration flow** to save user data
3. **Implement onboarding data persistence**
4. **Build the core booking system**

## 🚀 **Ready for Week 1 Completion**

With the database set up, you'll be ready to:
- Save user profiles during registration
- Store onboarding preferences
- Create and manage services
- Handle bookings and availability
- Track user interactions

**Let me know when you've completed the manual migration and we'll test the connection!** 