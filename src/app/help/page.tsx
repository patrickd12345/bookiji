import HelpSearch from '@/components/HelpSearch';
import HelpArticleCard from '@/components/HelpArticleCard';
import HelpCategoryFilter from '@/components/HelpCategoryFilter';
import { helpArticles, HelpArticle } from '@/lib/helpArticles';

export default function HelpCenterPage() {
  const articles: HelpArticle[] = helpArticles;
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Help Center</h1>
      {/* Search and filter are client components */}
      <ClientSide articles={articles} />
    </div>
  );
}

'use client';
import { useState, useCallback } from 'react';

function ClientSide({ articles }: { articles: HelpArticle[] }) {
  const [results, setResults] = useState<HelpArticle[]>(articles);
  const [category, setCategory] = useState<string | undefined>();
  const [query, setQuery] = useState('');

  const handleResults = useCallback((r: HelpArticle[]) => setResults(r), []);

  return (
    <div>
      <HelpSearch onResults={handleResults} category={category} onQueryChange={setQuery} />
      <HelpCategoryFilter onSelect={setCategory} />
      {results.length === 0 && <p>No results found.</p>}
      <div className="grid md:grid-cols-2 gap-4">
        {results.map(article => (
          <HelpArticleCard key={article.slug} article={article} highlight={query} />
        ))}
      </div>
    </div>
  );
}
