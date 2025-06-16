# Bookiji LLM Service Dockerfile
# Based on Ollama for Railway deployment

FROM ollama/ollama:latest

# Set environment variables
ENV OLLAMA_HOST=0.0.0.0
ENV OLLAMA_ORIGINS=*
ENV OLLAMA_MODELS=/root/.ollama/models

# Create app directory
WORKDIR /app

# Install additional dependencies if needed
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Pre-download the Llama 3.2 model (8B version for Railway)
# This ensures the model is available when the service starts
RUN ollama pull llama3.2:8b

# Create a startup script
COPY start-ollama.sh /app/start-ollama.sh
RUN chmod +x /app/start-ollama.sh

# Expose Ollama port
EXPOSE 11434

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:11434/api/tags || exit 1

# Start Ollama service
CMD ["/app/start-ollama.sh"] 