import { helpArticles } from '@/lib/helpArticles';
import HelpArticle from '@/components/HelpArticle';
import { notFound } from 'next/navigation';

interface Params { params: { slug: string } }

export default function ArticlePage({ params }: Params) {
  const article = helpArticles.find(a => a.slug === params.slug);
  if (!article) return notFound();
  return (
    <div className="max-w-3xl mx-auto p-4">
      <HelpArticle article={article} />
    </div>
  );
}
