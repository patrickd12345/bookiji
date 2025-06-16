# 🚂 Railway Deployment Guide for Bookiji

This guide walks you through deploying Bookiji to Railway with three services: Next.js frontend, LLM service (Ollama), and PostgreSQL database.

## 📋 Prerequisites

- [Railway account](https://railway.app)
- [Railway CLI](https://docs.railway.app/develop/cli) installed
- [Docker](https://docker.com) (for local testing)
- [Git](https://git-scm.com) repository with Bookiji code

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Railway Project                      │
├─────────────────────────────────────────────────────────┤
│  bookiji-frontend (Next.js)                             │
│  ├── Next.js 15 application                             │
│  ├── TypeScript + Tailwind CSS                          │
│  └── AI conversational interface                        │
├─────────────────────────────────────────────────────────┤
│  bookiji-llm (Ollama)                                   │
│  ├── Llama 3.2:8b model                                 │
│  ├── OpenAI-compatible API                              │
│  └── Real-time inference                                │
├─────────────────────────────────────────────────────────┤
│  bookiji-database (PostgreSQL)                          │
│  ├── User management                                    │
│  ├── Booking data                                       │
│  └── Availability tracking                              │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Deployment

### Option 1: Automated Script
```bash
# Make the script executable
chmod +x scripts/deploy-railway.sh

# Run the deployment script
./scripts/deploy-railway.sh
```

### Option 2: Manual Deployment
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Create and link project
railway project create --name "bookiji"
railway link

# 4. Deploy all services
railway up
```

## 🔧 Service Configuration

### 1. Frontend Service (Next.js)
```bash
# Create frontend service
railway service create --name "bookiji-frontend" --source-dir "."

# Set environment variables
railway variables set NODE_ENV=production --service bookiji-frontend
railway variables set NEXT_PUBLIC_APP_URL=https://bookiji-frontend.railway.app --service bookiji-frontend
railway variables set RAILWAY_LLM_URL=https://bookiji-llm.railway.app --service bookiji-frontend
```

### 2. LLM Service (Ollama)
```bash
# Create LLM service
railway service create --name "bookiji-llm" --source-dir "./llm"

# Set environment variables
railway variables set OLLAMA_HOST=0.0.0.0 --service bookiji-llm
railway variables set OLLAMA_ORIGINS=* --service bookiji-llm
railway variables set OLLAMA_MODEL=llama3.2:8b --service bookiji-llm
```

### 3. Database Service (PostgreSQL)
```bash
# Create database service
railway service create --name "bookiji-database" --image "postgres:15"

# Set environment variables
railway variables set POSTGRES_DB=bookiji --service bookiji-database
railway variables set POSTGRES_USER=bookiji_user --service bookiji-database
railway variables set POSTGRES_PASSWORD=bookiji_password_2024 --service bookiji-database
```

## 🔐 Environment Variables

### Required Variables
```bash
# App Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://bookiji-frontend.railway.app
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://bookiji-frontend.railway.app

# LLM Configuration
RAILWAY_LLM_URL=https://bookiji-llm.railway.app
RAILWAY_LLM_MODEL=llama3.2:8b

# Database Configuration
DATABASE_URL=postgresql://bookiji_user:bookiji_password_2024@bookiji-database.railway.app:5432/bookiji

# OAuth Providers (configure these)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# External APIs (configure these)
MAPBOX_ACCESS_TOKEN=your-mapbox-access-token
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
```

## 📊 Service URLs

After deployment, your services will be available at:

- **Frontend**: `https://bookiji-frontend.railway.app`
- **LLM API**: `https://bookiji-llm.railway.app`
- **Database**: `bookiji-database.railway.app:5432`

## 🔍 Monitoring & Debugging

### View Logs
```bash
# View all service logs
railway logs

# View specific service logs
railway logs --service bookiji-frontend
railway logs --service bookiji-llm
railway logs --service bookiji-database
```

### Service Status
```bash
# Check service status
railway status

# List all services
railway service list
```

### Restart Services
```bash
# Restart all services
railway restart

# Restart specific service
railway restart --service bookiji-llm
```

## 🧪 Testing the Deployment

### 1. Test Frontend
```bash
# Visit the frontend URL
curl https://bookiji-frontend.railway.app
```

### 2. Test LLM Service
```bash
# Test LLM health check
curl https://bookiji-llm.railway.app/api/tags

# Test LLM chat endpoint
curl -X POST https://bookiji-llm.railway.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2:8b",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

### 3. Test Database
```bash
# Connect to database (requires Railway CLI)
railway connect --service bookiji-database
```

## 🔄 Development Workflow

### Local Development
```bash
# Start local services
npm run dev          # Next.js frontend
ollama serve         # Local LLM
docker run postgres  # Local database
```

### Production Deployment
```bash
# Deploy to Railway
railway up

# Or use the automated script
./scripts/deploy-railway.sh
```

## 💰 Cost Estimation

Railway pricing (as of 2024):
- **Frontend**: $5/month (basic plan)
- **LLM Service**: $20/month (GPU plan for LLM)
- **Database**: $5/month (basic plan)
- **Total**: ~$30/month

## 🚨 Troubleshooting

### Common Issues

1. **LLM Service Not Starting**
   ```bash
   # Check LLM logs
   railway logs --service bookiji-llm
   
   # Verify model download
   railway connect --service bookiji-llm
   ollama list
   ```

2. **Database Connection Issues**
   ```bash
   # Check database logs
   railway logs --service bookiji-database
   
   # Test connection
   railway connect --service bookiji-database
   psql -h localhost -U bookiji_user -d bookiji
   ```

3. **Frontend Build Failures**
   ```bash
   # Check build logs
   railway logs --service bookiji-frontend
   
   # Test build locally
   npm run build
   ```

### Performance Optimization

1. **LLM Service**
   - Use smaller models for faster inference
   - Enable model caching
   - Monitor memory usage

2. **Database**
   - Add indexes for common queries
   - Use connection pooling
   - Monitor query performance

3. **Frontend**
   - Enable Next.js optimizations
   - Use CDN for static assets
   - Implement caching strategies

## 📈 Scaling

### Horizontal Scaling
```bash
# Scale LLM service for more concurrent requests
railway scale --service bookiji-llm --replicas 3

# Scale frontend for more traffic
railway scale --service bookiji-frontend --replicas 2
```

### Vertical Scaling
- Upgrade to Railway Pro plan for more resources
- Use larger instance types for LLM service
- Increase database storage as needed

## 🔐 Security

### Best Practices
1. **Environment Variables**: Never commit secrets to Git
2. **Database**: Use strong passwords and SSL connections
3. **LLM Service**: Restrict access to trusted domains
4. **Frontend**: Implement proper authentication and authorization

### SSL/TLS
- Railway provides automatic SSL certificates
- All traffic is encrypted by default
- No additional configuration needed

## 📞 Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Bookiji Issues**: Create GitHub issues for project-specific problems

---

**🎉 Congratulations!** Your Bookiji application is now deployed on Railway with a complete stack including AI capabilities, real-time booking, and a scalable database. 