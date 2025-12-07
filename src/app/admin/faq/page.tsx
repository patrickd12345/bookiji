"use client"

import { useEffect, useState, useCallback } from 'react'
import { supabaseBrowserClient } from '@/lib/supabaseClient'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface Article {
  id?: string
  title: string
  content: string
  slug?: string
  is_published: boolean
  category_id?: string | null
}

export default function AdminFAQPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Article | null>(null)
  const [form, setForm] = useState<Article>({
    title: '',
    content: '',
    is_published: true
  })

  const fetchArticles = useCallback(async () => {
    const supabase = supabaseBrowserClient()
    if (!supabase) return
    
    setLoading(true)
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('id,title,is_published,slug')
      .order('updated_at', { ascending: false })
    if (error) {
      console.error(error)
    } else {
      setArticles(data as Article[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    const isChecked = (e.target as HTMLInputElement).checked
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? isChecked : value
    }))
  }

  function startEdit(article?: Article) {
    if (article) {
      setEditing(article)
      setForm({ ...article })
    } else {
      setEditing(null)
      setForm({ title: '', content: '', is_published: true })
    }
  }

  async function saveArticle() {
    if (!form.title || !form.content) return alert('Title and content required')
    const supabase = supabaseBrowserClient()
    if (!supabase) return
    
    setLoading(true)
    if (editing?.id) {
      // update
      const { error } = await supabase
        .from('knowledge_base')
        .update({
          title: form.title,
          content: form.content,
          is_published: form.is_published,
          slug: form.slug
        })
        .eq('id', editing.id)
      if (error) console.error(error)
    } else {
      // insert
      const { error } = await supabase.from('knowledge_base').insert([
        {
          title: form.title,
          content: form.content,
          is_published: form.is_published,
          slug: form.slug
        }
      ])
      if (error) console.error(error)
    }
    await fetchArticles()
    startEdit()
  }

  async function deleteArticle(id: string) {
    if (!confirm('Delete this article?')) return
    const supabase = supabaseBrowserClient()
    if (!supabase) return
    
    const { error } = await supabase.from('knowledge_base').delete().eq('id', id)
    if (error) console.error(error)
    fetchArticles()
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">FAQ / Knowledge Base Management</h1>

      {/* List */}
      <Card className="p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-medium">Existing Articles</h2>
          <Button onClick={() => startEdit()}>+ New Article</Button>
        </div>
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Title</th>
              <th className="py-2">Slug</th>
              <th className="py-2">Published</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id} className="border-b">
                <td className="py-2">{a.title}</td>
                <td className="py-2 text-gray-500">{a.slug}</td>
                <td className="py-2">{a.is_published ? 'Yes' : 'No'}</td>
                <td className="py-2 space-x-2">
                  <Button variant="secondary" size="sm" onClick={() => startEdit(a)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteArticle(a.id!)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {articles.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-gray-500">
                  No articles yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Editor */}
      {(editing || form.title) && (
        <Card className="p-4">
          <h2 className="font-medium mb-4">{editing ? 'Edit Article' : 'New Article'}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input name="title" value={form.title} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug (optional)</label>
              <Input name="slug" value={form.slug || ''} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Content (HTML allowed)</label>
              <textarea
                name="content"
                value={form.content}
                onChange={handleChange}
                className="w-full border rounded-md p-2 h-40 text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="is_published"
                checked={form.is_published}
                onChange={handleChange}
              />
              <span className="text-sm">Published</span>
            </div>
            <div className="space-x-2">
              <Button onClick={saveArticle}>{editing ? 'Save Changes' : 'Create'}</Button>
              {editing && (
                <Button variant="secondary" onClick={() => startEdit()}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
} 