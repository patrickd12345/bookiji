import { useState } from 'react';
import { helpArticles } from '@/lib/helpArticles';

interface Props {
  onSelect: (category?: string) => void;
}

export default function HelpCategoryFilter({ onSelect }: Props) {
  const categories = Array.from(new Set(helpArticles.map(a => a.category)));
  const [selected, setSelected] = useState<string | undefined>();

  const handle = (cat?: string) => {
    setSelected(cat);
    onSelect(cat);
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        onClick={() => handle(undefined)}
        className={`px-3 py-1 rounded-full border text-sm ${!selected ? 'bg-primary text-primary-foreground' : ''}`}
      >
        All
      </button>
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => handle(cat)}
          className={`px-3 py-1 rounded-full border text-sm ${selected===cat ? 'bg-primary text-primary-foreground' : ''}`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
