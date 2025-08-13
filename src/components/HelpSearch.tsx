'use client';

import { useEffect, useState } from 'react';
import { searchArticles, HelpArticle } from '@/lib/helpArticles';

interface Props {
  onResults: (articles: HelpArticle[]) => void;
  onQueryChange?: (q: string) => void;
  category?: string;
}

export default function HelpSearch({ onResults, onQueryChange, category }: Props) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => {
      const results = searchArticles(query, category);
      onResults(results);
      onQueryChange?.(query);
    }, 200);
    return () => clearTimeout(handle);
  }, [query, category, onResults, onQueryChange]);

  return (
    <input
      type="text"
      placeholder="Search help articles..."
      value={query}
      onChange={e => setQuery(e.target.value)}
      className="w-full p-2 border rounded-md mb-4"
      aria-label="Search help articles"
    />
  );
}
