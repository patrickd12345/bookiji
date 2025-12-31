'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { SpecialtyTreeSelect } from '@/components/SpecialtyTreeSelect'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { logger } from '@/lib/logger'

export default function SpecialtyDemo() {
  const [selectedSpecialty, setSelectedSpecialty] = useState<{ id: string; name: string } | null>(null)
  const [vendorName, setVendorName] = useState('')
  const [email, setEmail] = useState('')

  const handleSpecialtyChange = (id: string, name: string) => {
    setSelectedSpecialty({ id, name })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    logger.info('Vendor registration:', {
      name: vendorName,
      email,
      specialty: selectedSpecialty
    })
    alert('Registration submitted! Check console for details.')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Vendor Registration Demo
          </h1>
          <p className="text-xl text-gray-600">
            Experience the hierarchical specialty selection system
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Registration Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Vendor Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="vendorName">Business Name</Label>
                    <Input
                      id="vendorName"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      placeholder="Enter your business name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      required
                    />
                  </div>

                  <div>
                    <Label>Primary Specialty</Label>
                    <div className="mt-2">
                      <SpecialtyTreeSelect
                        value={selectedSpecialty?.id}
                        onChangeAction={handleSpecialtyChange}
                        placeholder="Select your primary service specialty"
                      />
                    </div>
                  </div>

                  {selectedSpecialty && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>Selected:</strong> {selectedSpecialty.name}
                      </p>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={!selectedSpecialty}>
                    Complete Registration
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Features Showcase */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Key Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Hierarchical Navigation</h3>
                    <p className="text-sm text-gray-600">
                      Browse through categories and subcategories with intuitive breadcrumb navigation
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Smart Search</h3>
                    <p className="text-sm text-gray-600">
                      Find specialties quickly with type-ahead search across names and aliases
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Suggestion System</h3>
                    <p className="text-sm text-gray-600">
                      Can&apos;t find your specialty? Suggest a new one for admin review
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm font-bold">4</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Mobile Friendly</h3>
                    <p className="text-sm text-gray-600">
                      Responsive design that works perfectly on all devices
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <p>
                    <strong>1.</strong> Start by browsing root categories or use search to find specific services
                  </p>
                  <p>
                    <strong>2.</strong> Click the chevron icon to explore subcategories
                  </p>
                  <p>
                    <strong>3.</strong> Select your specialty by clicking on the service name
                  </p>
                  <p>
                    <strong>4.</strong> If you can&apos;t find what you need, use the &quot;Suggest this specialty&quot; feature
                  </p>
                  <p>
                    <strong>5.</strong> Complete your registration with the selected specialty
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Demo Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12"
        >
          <Card>
            <CardHeader>
              <CardTitle>Demo Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Try These Scenarios:</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Browse through &quot;Home Improvement&quot; → &quot;Plumbing&quot; → &quot;Drain Cleaning&quot;</li>
                    <li>• Search for &quot;computer&quot; to find computer-related services</li>
                    <li>• Try searching for &quot;unclog&quot; to see alias matching</li>
                    <li>• Navigate to a category with no results and try the suggestion feature</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Admin Features:</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• View all admin pages at /admin</li>
                    <li>• Manage specialties taxonomy at /admin/specialties</li>
                    <li>• Review vendor suggestions at /admin/suggestions</li>
                    <li>• Monitor customers at /admin/customers</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}


