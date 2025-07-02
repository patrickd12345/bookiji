"use client"

import React, { useEffect, useState } from 'react'
import { Input } from './ui/input'
import { Card } from './ui/card'

interface Category {
  id: string
  name: string
  icon: string | null
}

interface Article {
  id: string
  title: string
  content: string
  slug: string
}

const SmartFAQ: React.FC = () => {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(false)

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(id)
  }, [search])

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      const res = await fetch('/api/support/categories')
      const json = await res.json()
      if (json.ok) setCategories(json.data)
    }
    fetchCategories()
  }, [])

  // Fetch articles whenever search or category changes
  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true)
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (selectedCategory) params.set('category', selectedCategory)
      const res = await fetch(`/api/support/faq?${params.toString()}`)
      const json = await res.json()
      if (json.ok) setArticles(json.data)
      if (json.ok && json.data.length === 0 && debouncedSearch.length > 3) {
        // Log unanswered query
        fetch('/api/support/unanswered', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query_text: debouncedSearch, source: 'faq' })
        })
      }
      setLoading(false)
    }
    fetchArticles()
  }, [debouncedSearch, selectedCategory])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Input
          placeholder="Search FAQs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon ? `${cat.icon} ` : ''}{cat.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading...</p>}

      <div className="space-y-2">
        {articles.map((art) => (
          <Disclosure key={art.id} title={art.title} content={art.content} />
        ))}
        {articles.length === 0 && !loading && (
          <p className="text-sm text-gray-500">No articles found.</p>
        )}
      </div>
    </div>
  )
}

interface DisclosureProps {
  title: string
  content: string
}

const Disclosure: React.FC<DisclosureProps> = ({ title, content }) => {
  const [open, setOpen] = useState(false)
  return (
    <Card className="p-4 cursor-pointer" onClick={() => setOpen(!open)}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm sm:text-base">{title}</h3>
        <ChevronDown open={open} />
      </div>
      {open && (
        <div
          className="mt-2 text-sm prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
    </Card>
  )
}

// Simple Chevron Icon component to avoid external dependency
const ChevronDown: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
      clipRule="evenodd"
    />
  </svg>
)

export default SmartFAQ 