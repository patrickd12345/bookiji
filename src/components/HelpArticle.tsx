import Link from 'next/link';
import type { HelpArticle } from '@/lib/helpArticles';
import { SafeHtml } from '@/lib/utils/safeHtml';

export default function HelpArticle({ article }: { article: HelpArticle }) {
  return (
    <article className="prose max-w-none">
      <h1>{article.title}</h1>
      <SafeHtml html={article.content} allowUnsafe={false} />
      {article.related && article.related.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-2">Related Articles</h2>
          <ul className="list-disc ml-6">
            {article.related.map(slug => (
              <li key={slug}>
                <Link href={`/help/${slug}`}>{slugToTitle(slug)}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function slugToTitle(slug: string) {
  return slug
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
