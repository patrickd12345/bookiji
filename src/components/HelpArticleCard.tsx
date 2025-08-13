import Link from 'next/link';
import type { HelpArticle } from '@/lib/helpArticles';

interface Props {
  article: HelpArticle;
  highlight?: string;
}

export default function HelpArticleCard({ article, highlight }: Props) {
  let preview = article.content.replace(/<[^>]+>/g, '').slice(0, 120) + '…';
  if (highlight) {
    const reg = new RegExp(`(${highlight})`, 'ig');
    preview = preview.replace(reg, '<mark>$1</mark>');
  }
  return (
    <Link href={`/help/${article.slug}`} className="block border rounded-md p-4 hover:bg-muted">
      <h3 className="font-semibold mb-2" dangerouslySetInnerHTML={{ __html: highlight ? article.title.replace(new RegExp(`(${highlight})`, 'ig'), '<mark>$1</mark>') : article.title }} />
      <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: preview }} />
    </Link>
  );
}
