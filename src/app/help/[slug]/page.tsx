import { helpArticles } from '@/lib/helpArticles'
import HelpArticle from '@/components/HelpArticle'
import { notFound } from 'next/navigation'

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const article = helpArticles.find(a => a.slug === slug)
  if (!article) notFound()
  return (
    <div className="max-w-3xl mx-auto p-4">
      <HelpArticle article={article} />
    </div>
  )
}

