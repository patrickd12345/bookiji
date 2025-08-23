'use client'

import { motion } from 'framer-motion'

export default function SpecialtiesPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Specialties</h1>
        <p className="text-gray-600">Manage service specialties and categories</p>
      </div>
      
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Specialty Management</h2>
        <p className="text-gray-600">Specialty management functionality coming soon...</p>
      </div>
    </motion.div>
  )
}



