export async function embed(texts: string[]): Promise<number[][]> {
  // Use local Ollama for embeddings
  const ollamaUrl = process.env.OLLAMA_ENDPOINT || process.env.OLLAMA_HOST || 'http://localhost:11434';
  
  const embeddings: number[][] = [];
  
  for (const text of texts) {
    try {
      const res = await fetch(`${ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          model: 'nomic-embed-text', 
          prompt: text 
        })
      });
      
      if (!res.ok) {
        throw new Error(`Ollama embeddings failed: ${res.status}`);
      }
      
      const json = await res.json();
      if (json.embedding && Array.isArray(json.embedding)) {
        embeddings.push(json.embedding);
      } else {
        throw new Error('Invalid embedding response from Ollama');
      }
    } catch (error) {
      console.error('Embedding error:', error);
      // Return a fallback embedding (zero vector) if Ollama fails
      embeddings.push(new Array(384).fill(0));
    }
  }
  
  return embeddings;
}
