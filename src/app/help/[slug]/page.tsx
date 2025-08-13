import { helpArticles } from '@/lib/helpArticles';
import HelpArticle from '@/components/HelpArticle';
import { notFound } from 'next/navigation';

export default function ArticlePage({ params }: any) {
  const article = helpArticles.find(a => a.slug === params.slug);
  if (!article) return notFound();
  return (
    <div className="max-w-3xl mx-auto p-4">
      <HelpArticle article={article} />
    </div>
  );
}
