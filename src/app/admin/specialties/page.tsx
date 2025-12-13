'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plus, Edit, Trash2, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'


interface Specialty {
  id: string
  name: string
  slug: string
  parent_id: string | null
  path: string
  is_active: boolean
  created_at: string
  updated_at: string
  children?: Specialty[]
}

interface SpecialtyForm {
  name: string
  parent_id: string | null
  is_active: boolean
}

export default function SpecialtiesPage() {
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [filteredSpecialties, setFilteredSpecialties] = useState<Specialty[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [formData, setFormData] = useState<SpecialtyForm>({
    name: '',
    parent_id: null,
    is_active: true
  })

  const loadSpecialties = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/specialties')
      if (response.ok) {
        const data = await response.json()
        const hierarchicalData = buildHierarchy(data.items || [])
        setSpecialties(hierarchicalData)
      } else {
        alert('Failed to load specialties')
      }
    } catch (error) {
      console.error('Error loading specialties:', error)
              alert('Failed to load specialties')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load specialties on mount
  useEffect(() => {
    loadSpecialties()
  }, [loadSpecialties])

  // Filter specialties based on search and status
  useEffect(() => {
    let filtered = specialties

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(specialty =>
        specialty.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        specialty.slug.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(specialty =>
        statusFilter === 'active' ? specialty.is_active : !specialty.is_active
      )
    }

    setFilteredSpecialties(filtered)
  }, [specialties, searchQuery, statusFilter])

  const buildHierarchy = (flatSpecialties: Specialty[]): Specialty[] => {
    const specialtyMap = new Map<string, Specialty>()
    const roots: Specialty[] = []

    // Create map of all specialties
    flatSpecialties.forEach(specialty => {
      specialtyMap.set(specialty.id, { ...specialty, children: [] })
    })

    // Build hierarchy
    flatSpecialties.forEach(specialty => {
      if (specialty.parent_id) {
        const parent = specialtyMap.get(specialty.parent_id)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(specialtyMap.get(specialty.id)!)
        }
      } else {
        roots.push(specialtyMap.get(specialty.id)!)
      }
    })

    return roots
  }

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/specialties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        alert('Specialty created successfully')
        setShowCreateDialog(false)
        setFormData({ name: '', parent_id: null, is_active: true })
        loadSpecialties()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create specialty')
      }
    } catch (error) {
      console.error('Error creating specialty:', error)
      alert('Failed to create specialty')
    }
  }

  const handleUpdate = async () => {
    if (!editingSpecialty) return

    try {
      const response = await fetch(`/api/specialties/${editingSpecialty.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        alert('Specialty updated successfully')
        setEditingSpecialty(null)
        setFormData({ name: '', parent_id: null, is_active: true })
        loadSpecialties()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update specialty')
      }
    } catch (error) {
      console.error('Error updating specialty:', error)
      alert('Failed to update specialty')
    }
  }

  const handleDelete = async (specialtyId: string) => {
    if (!confirm('Are you sure you want to delete this specialty? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/specialties/${specialtyId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Specialty deleted successfully')
        loadSpecialties()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete specialty')
      }
    } catch (error) {
      console.error('Error deleting specialty:', error)
      alert('Failed to delete specialty')
    }
  }

  const renderSpecialtyNode = (specialty: Specialty, level: number = 0) => {
    const hasChildren = specialty.children && specialty.children.length > 0
    const isExpanded = expandedNodes.has(specialty.id)

    return (
      <div key={specialty.id} className="space-y-1">
        <div className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 ${level > 0 ? 'ml-6' : ''}`}>
          {hasChildren && (
            <button
              onClick={() => toggleNode(specialty.id)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}
          
          <div className="flex-1 flex items-center space-x-3">
            <Badge variant={specialty.is_active ? 'default' : 'secondary'}>
              {specialty.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <span className="font-medium">{specialty.name}</span>
            <span className="text-sm text-gray-500">({specialty.slug})</span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingSpecialty(specialty)
                setFormData({
                  name: specialty.name,
                  parent_id: specialty.parent_id,
                  is_active: specialty.is_active
                })
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(specialty.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-6">
            {specialty.children!.map(child => renderSpecialtyNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading specialties...</div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Specialties Management</h1>
          <p className="text-gray-600">Manage service specialties and categories hierarchy</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Specialty
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search specialties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select 
              value={statusFilter} 
              onValueChange={(value: string) => {
                if (value === 'all' || value === 'active' || value === 'inactive') {
                  setStatusFilter(value)
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Specialties Tree */}
      <Card>
        <CardHeader>
          <CardTitle>Specialties Hierarchy</CardTitle>
          <p className="text-sm text-gray-600">
            {filteredSpecialties.length} specialties found
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredSpecialties.length > 0 ? (
              filteredSpecialties.map(specialty => renderSpecialtyNode(specialty))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No specialties found matching your criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Specialty Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Specialty</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter specialty name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Parent Category (Optional)</label>
              <Select
                value={formData.parent_id || ''}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  parent_id: value || null 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Parent (Root Category)</SelectItem>
                  {specialties.map(specialty => (
                    <SelectItem key={specialty.id} value={specialty.id}>
                      {specialty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="is_active" className="text-sm font-medium">
                Active
              </label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!formData.name.trim()}>
                Create Specialty
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Specialty Dialog */}
      <Dialog open={!!editingSpecialty} onOpenChange={() => setEditingSpecialty(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Specialty</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter specialty name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Parent Category (Optional)</label>
              <Select
                value={formData.parent_id || ''}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  parent_id: value || null 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Parent (Root Category)</SelectItem>
                  {specialties
                    .filter(s => s.id !== editingSpecialty?.id)
                    .map(specialty => (
                      <SelectItem key={specialty.id} value={specialty.id}>
                        {specialty.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit_is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="edit_is_active" className="text-sm font-medium">
                Active
              </label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingSpecialty(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={!formData.name.trim()}>
                Update Specialty
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}



