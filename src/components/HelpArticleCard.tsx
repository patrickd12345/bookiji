import Link from 'next/link';
import type { HelpArticle } from '@/lib/helpArticles';
import { SafeHtml } from '@/lib/utils/safeHtml';

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
  const highlightedTitle = highlight 
    ? article.title.replace(new RegExp(`(${highlight})`, 'ig'), '<mark>$1</mark>') 
    : article.title;

  return (
    <Link href={`/help/${article.slug}`} className="block border rounded-md p-4 hover:bg-muted">
      <SafeHtml html={highlightedTitle} className="font-semibold mb-2" allowUnsafe={false} />
      <SafeHtml html={preview} className="text-sm text-muted-foreground" allowUnsafe={false} />
    </Link>
  );
}
