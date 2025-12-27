# 🚀 Quick Setup Guide - Bookiji Streamlined Stack

This guide gets you up and running with Bookiji's streamlined development stack in minutes.

## 📋 Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org)
- **pnpm** - `npm install -g pnpm`
- **Ollama** - [Download here](https://ollama.ai)

## ⚡ Quick Start (5 minutes)

### 1. **Clone & Install**
```bash
git clone <your-repo>
cd bookiji
pnpm install
```

### 2. **Set Up Environment**
```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your keys:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY  
# - MAPBOX_ACCESS_TOKEN
# - OLLAMA_ENDPOINT=http://localhost:11434
```

### 3. **Start Ollama (AI)**
```bash
# Install Ollama if not already installed
# https://ollama.ai

# Pull the Mistral model
ollama pull mistral

# Start Ollama server (in background)
ollama serve
```

### 4. **Run Development Server**
```bash
pnpm dev
```

### 5. **Open & Test**
- Navigate to `http://localhost:3000`
- Test all features using demo buttons
- Try AI conversational interface

## 🧠 AI Setup (Ollama)

### **Install Ollama**
```bash
# macOS
brew install ollama

# Windows
# Download from https://ollama.ai

# Linux
curl -fsSL https://ollama.ai/install.sh | sh
```

### **Pull Model**
```bash
# Pull Mistral (recommended for Bookiji)
ollama pull mistral

# Alternative models
ollama pull llama3.2:8b
ollama pull codellama:7b
```

### **Test AI**
```bash
# Test Ollama is working
curl http://localhost:11434/api/generate -d '{
  "model": "mistral",
  "prompt": "Hello, how can I help you book a service?"
}'
```

## 🗄 Database Setup (Supabase)

### **0. Preflight Check (REQUIRED)**
**Before any Supabase operations, verify CLI authentication:**
```bash
pnpm supabase:doctor
```

This checks if Supabase CLI is authenticated. If it fails:
- Run `supabase login` (CLI authentication, separate from app credentials)
- See: `docs/development/SUPABASE_CLI_AUTH.md` for details

**Why this matters:** CLI auth errors cause confusing failures. This catches them in 5 seconds instead of 30 minutes.

### **1. Create Supabase Project**
- Go to [supabase.com](https://supabase.com)
- Create new project
- Note your project URL and anon key

### **2. Set Environment Variables**
```bash
# In .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### **3. Basic Schema (Optional)**
```sql
-- Users table (handled by Supabase Auth)
-- Bookings table
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES auth.users(id),
  vendor_id UUID REFERENCES auth.users(id),
  service_type TEXT NOT NULL,
  booking_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
```

## 🗺 Map Setup (Mapbox)

### **1. Get Mapbox Token**
- Go to [mapbox.com](https://mapbox.com)
- Create account and get access token
- Add to `.env.local`:
  ```
  MAPBOX_ACCESS_TOKEN=your-token
  ```

### **2. Test Map Integration**
- The map components are ready for integration
- Update `MapAbstraction.tsx` with your token

## 🔐 Authentication Setup (Supabase)

### **1. Configure Auth Providers**
In Supabase Dashboard:
- Go to Authentication → Settings
- Enable providers: Google, GitHub, Email
- Configure redirect URLs

### **2. Set Up Auth in App**
```typescript
// In your auth configuration
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

## 🚀 Deployment (Vercel)

### **1. Deploy to Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### **2. Environment Variables in Vercel**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `MAPBOX_ACCESS_TOKEN`
- `OLLAMA_ENDPOINT` (if using cloud Ollama)

## 🧪 Development Workflow

### **Daily Development**
```bash
# Start all services
ollama serve &  # AI server
pnpm dev        # Next.js dev server

# In another terminal
pnpm type-check # Type checking
pnpm lint       # Linting
```

### **Testing Features**
- **AI Radius Scaling**: Click "Test Radius" button
- **Map Abstraction**: Use "Toggle Abstraction" 
- **No-Show System**: Click "Demo Feedback"
- **AI Conversational**: Try AI input field
- **Booking Guarantee**: Use "Demo Booking"

## 🔧 Troubleshooting

### **Ollama Issues**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
pkill ollama
ollama serve

# Check model is downloaded
ollama list
```

### **Supabase Issues**
```bash
# Test connection
curl https://your-project.supabase.co/rest/v1/

# Check environment variables
echo $SUPABASE_URL
```

### **Next.js Issues**
```bash
# Clear cache
rm -rf .next
pnpm dev

# Check dependencies
pnpm install
```

## 📊 Performance Tips

### **Development**
- Use `pnpm` for faster installs
- Enable TypeScript strict mode
- Use React DevTools for debugging

### **Production**
- Enable Next.js optimizations
- Use Supabase connection pooling
- Configure Ollama for production (or use cloud)

## 🎯 Next Steps

1. **Set up Supabase database schema**
2. **Integrate Mapbox maps**
3. **Configure payment system (Stripe)**
4. **Add real-time features**
5. **Deploy to production**

---

**Need help?** Check the main README.md for detailed documentation or create an issue in the repository. 