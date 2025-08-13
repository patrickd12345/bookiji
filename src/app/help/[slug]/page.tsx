import { helpArticles } from '@/lib/helpArticles'
import HelpArticle from '@/components/HelpArticle'
import { notFound } from 'next/navigation'

type PageProps = {
  params: { slug: string }
}

export default function ArticlePage({ params }: PageProps) {
  const article = helpArticles.find(a => a.slug === params.slug)
  if (!article) {
    notFound()
  }
  return (
    <div className="max-w-3xl mx-auto p-4">
      <HelpArticle article={article} />
    </div>
  )
}

