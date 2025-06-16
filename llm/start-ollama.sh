#!/bin/bash

# Bookiji LLM Service Startup Script
# Handles Ollama initialization and model loading

set -e

echo "🚀 Starting Bookiji LLM Service..."

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed"
    exit 1
fi

# Set environment variables
export OLLAMA_HOST=0.0.0.0
export OLLAMA_ORIGINS=*

# Check if the model exists, if not pull it
echo "📦 Checking for Llama 3.2 model..."
if ! ollama list | grep -q "llama3.2:8b"; then
    echo "📥 Downloading Llama 3.2:8b model..."
    ollama pull llama3.2:8b
    echo "✅ Model downloaded successfully"
else
    echo "✅ Model already exists"
fi

# List available models
echo "📋 Available models:"
ollama list

# Start Ollama server
echo "🌐 Starting Ollama server on 0.0.0.0:11434..."
echo "🔗 Service will be available at: http://localhost:11434"
echo "📡 API endpoint: http://localhost:11434/api/chat"

# Start the server
exec ollama serve 