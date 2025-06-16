#!/bin/bash

# Bookiji Railway Deployment Script
# Automates the deployment of Next.js + LLM + Database to Railway

set -e

echo "🚀 Starting Bookiji Railway Deployment..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "🔐 Please log in to Railway first:"
    echo "railway login"
    exit 1
fi

echo "✅ Railway CLI is ready"

# Create Railway project if it doesn't exist
echo "📦 Creating Railway project..."
if ! railway project list | grep -q "bookiji"; then
    railway project create --name "bookiji"
    echo "✅ Project created"
else
    echo "✅ Project already exists"
fi

# Link the project
echo "🔗 Linking project..."
railway link

# Set up environment variables
echo "🔧 Setting up environment variables..."
railway variables set NODE_ENV=production
railway variables set NEXT_PUBLIC_APP_URL=https://bookiji-frontend.railway.app
railway variables set RAILWAY_LLM_URL=https://bookiji-llm.railway.app
railway variables set RAILWAY_LLM_MODEL=llama3.2:8b
railway variables set DATABASE_URL=postgresql://bookiji_user:bookiji_password_2024@bookiji-database.railway.app:5432/bookiji

# Deploy the services
echo "🚀 Deploying services..."

# Deploy database first
echo "🗄️  Deploying database service..."
railway service create --name "bookiji-database" --image "postgres:15"
railway variables set POSTGRES_DB=bookiji --service bookiji-database
railway variables set POSTGRES_USER=bookiji_user --service bookiji-database
railway variables set POSTGRES_PASSWORD=bookiji_password_2024 --service bookiji-database

# Deploy LLM service
echo "🤖 Deploying LLM service..."
railway service create --name "bookiji-llm" --source-dir "./llm"
railway variables set OLLAMA_HOST=0.0.0.0 --service bookiji-llm
railway variables set OLLAMA_ORIGINS=* --service bookiji-llm

# Deploy frontend service
echo "🌐 Deploying frontend service..."
railway service create --name "bookiji-frontend" --source-dir "."
railway variables set NODE_ENV=production --service bookiji-frontend
railway variables set NEXT_PUBLIC_APP_URL=https://bookiji-frontend.railway.app --service bookiji-frontend

# Deploy all services
echo "🚀 Deploying all services..."
railway up

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service status
echo "📊 Checking service status..."
railway status

# Get service URLs
echo "🔗 Service URLs:"
railway domain list

echo "✅ Deployment complete!"
echo ""
echo "🌐 Frontend: https://bookiji-frontend.railway.app"
echo "🤖 LLM API: https://bookiji-llm.railway.app"
echo "🗄️  Database: bookiji-database.railway.app:5432"
echo ""
echo "📝 Next steps:"
echo "1. Configure OAuth providers (Google, GitHub)"
echo "2. Set up Mapbox API key"
echo "3. Configure Stripe payment keys"
echo "4. Test the AI conversational interface"
echo ""
echo "🔧 To view logs: railway logs"
echo "🔧 To restart services: railway restart" 