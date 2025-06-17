'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AdminStats, 
  AdminAction, 
  AdminNotification, 
  Vendor, 
  Customer, 
  Admin 
} from '../types';

interface AdminCockpitProps {
  showAdminCockpit: boolean;
  setShowAdminCockpit: (show: boolean) => void;
  currentAdmin: Admin;
}

export default function AdminCockpit({
  showAdminCockpit,
  setShowAdminCockpit,
  currentAdmin
}: AdminCockpitProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'vendors' | 'verifications' | 'actions' | 'notifications'>('dashboard');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedAction, setSelectedAction] = useState<AdminAction | null>(null);
  const [formattedUsers, setFormattedUsers] = useState("");
  const [formattedTotalVendors, setFormattedTotalVendors] = useState("");
  const [formattedTotalBookings, setFormattedTotalBookings] = useState("");
  const [formattedTotalRevenue, setFormattedTotalRevenue] = useState("");
  const [formattedThisMonthRevenue, setFormattedThisMonthRevenue] = useState("");

  // Mock data - in real app, this would come from API
  const adminStats: AdminStats = {
    totalUsers: 1247,
    totalVendors: 89,
    totalBookings: 3421,
    totalRevenue: 45678.90,
    activeBookings: 156,
    pendingVerifications: 12,
    thisMonth: {
      newUsers: 234,
      newVendors: 15,
      bookings: 892,
      revenue: 12345.67
    }
  };

  const pendingVendors: Vendor[] = [
    {
      id: '1',
      email: 'sarah@salon.com',
      name: 'Sarah Johnson',
      role: 'vendor',
      createdAt: new Date('2024-01-15'),
      isActive: true,
      businessName: 'Sarah\'s Salon',
      businessType: 'individual',
      services: [],
      location: { address: '123 Main St', lat: 40.7128, lng: -74.0060, city: 'New York', state: 'NY', zipCode: '10001' },
      businessHours: {} as any,
      verificationStatus: 'pending',
      documents: [],
      earnings: { totalEarnings: 0, thisMonth: 0, lastMonth: 0, pendingPayouts: 0, completedBookings: 0, cancelledBookings: 0 }
    }
  ];

  const adminActions: AdminAction[] = [
    {
      id: '1',
      type: 'verify_vendor',
      targetId: 'vendor-1',
      targetType: 'vendor',
      status: 'pending',
      createdAt: new Date('2024-01-20'),
      adminId: currentAdmin.id,
      notes: 'Documents look good, ready for approval'
    }
  ];

  const notifications: AdminNotification[] = [
    {
      id: '1',
      type: 'verification_request',
      title: 'New Vendor Verification Request',
      message: 'Sarah\'s Salon has submitted verification documents',
      priority: 'medium',
      isRead: false,
      createdAt: new Date('2024-01-20'),
      actionRequired: true
    }
  ];

  const handleVerifyVendor = (vendorId: string, approved: boolean) => {
    // In real app, this would make an API call
    console.log(`Vendor ${vendorId} ${approved ? 'approved' : 'rejected'}`);
    setSelectedVendor(null);
  };

  const handleCompleteAction = (actionId: string) => {
    // In real app, this would make an API call
    console.log(`Action ${actionId} completed`);
    setSelectedAction(null);
  };

  const handleMarkNotificationRead = (notificationId: string) => {
    // In real app, this would make an API call
    console.log(`Notification ${notificationId} marked as read`);
  };

  useEffect(() => {
    setFormattedUsers(adminStats.totalUsers.toLocaleString());
  }, [adminStats.totalUsers]);

  useEffect(() => {
    setFormattedTotalVendors(adminStats.totalVendors.toLocaleString());
  }, [adminStats.totalVendors]);

  useEffect(() => {
    setFormattedTotalBookings(adminStats.totalBookings.toLocaleString());
  }, [adminStats.totalBookings]);

  useEffect(() => {
    setFormattedTotalRevenue(adminStats.totalRevenue.toLocaleString());
  }, [adminStats.totalRevenue]);

  useEffect(() => {
    setFormattedThisMonthRevenue(adminStats.thisMonth.revenue.toLocaleString());
  }, [adminStats.thisMonth.revenue]);

  return (
    <AnimatePresence>
      {showAdminCockpit && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Admin Cockpit</h2>
                  <p className="text-blue-100">Welcome back, {currentAdmin.name}</p>
                </div>
                <button
                  onClick={() => setShowAdminCockpit(false)}
                  className="text-white hover:text-blue-200"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'dashboard', name: 'Dashboard', icon: '📊' },
                  { id: 'users', name: 'Users', icon: '👥' },
                  { id: 'vendors', name: 'Vendors', icon: '🏢' },
                  { id: 'verifications', name: 'Verifications', icon: '✅' },
                  { id: 'actions', name: 'Actions', icon: '⚡' },
                  { id: 'notifications', name: 'Notifications', icon: '🔔' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-2 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <span className="text-2xl">👥</span>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Users</p>
                          <p className="text-2xl font-bold text-gray-900">{formattedUsers}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-green-600 text-sm">+{adminStats.thisMonth.newUsers} this month</span>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <span className="text-2xl">🏢</span>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Vendors</p>
                          <p className="text-2xl font-bold text-gray-900">{formattedTotalVendors}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-green-600 text-sm">+{adminStats.thisMonth.newVendors} this month</span>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <span className="text-2xl">📅</span>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                          <p className="text-2xl font-bold text-gray-900">{formattedTotalBookings}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-green-600 text-sm">+{adminStats.thisMonth.bookings} this month</span>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <span className="text-2xl">💰</span>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                          <p className="text-2xl font-bold text-gray-900">${formattedTotalRevenue}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-green-600 text-sm">+${formattedThisMonthRevenue} this month</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                      <div className="space-y-3">
                        <button className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                          Review Pending Verifications ({adminStats.pendingVerifications})
                        </button>
                        <button className="w-full py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                          View Active Bookings ({adminStats.activeBookings})
                        </button>
                        <button className="w-full py-2 px-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                          Generate Reports
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">New vendor registration: Sarah's Salon</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">25 new bookings today</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">Payment processed: $1,234.56</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'vendors' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Vendor Management</h3>
                    <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                      Export Data
                    </button>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vendor
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Services
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Earnings
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pendingVendors.map(vendor => (
                          <tr key={vendor.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{vendor.businessName}</div>
                                <div className="text-sm text-gray-500">{vendor.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                vendor.verificationStatus === 'verified' ? 'bg-green-100 text-green-800' :
                                vendor.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {vendor.verificationStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {vendor.services.length} services
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ${vendor.earnings.totalEarnings}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => setSelectedVendor(vendor)}
                                className="text-blue-600 hover:text-blue-900 mr-3"
                              >
                                View
                              </button>
                              <button className="text-red-600 hover:text-red-900">
                                Suspend
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'verifications' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Pending Verifications</h3>
                  
                  <div className="space-y-4">
                    {pendingVendors.map(vendor => (
                      <div key={vendor.id} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">{vendor.businessName}</h4>
                            <p className="text-sm text-gray-600">{vendor.email} • {vendor.location.city}, {vendor.location.state}</p>
                          </div>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pending Review
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">Business Information</h5>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>Type: {vendor.businessType}</div>
                              <div>Address: {vendor.location.address}</div>
                              <div>Services: {vendor.services.length} services</div>
                            </div>
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">Documents</h5>
                            <div className="text-sm text-gray-600">
                              {vendor.documents.length > 0 ? (
                                <div className="space-y-1">
                                  {vendor.documents.map(doc => (
                                    <div key={doc.id} className="flex items-center space-x-2">
                                      <span>📄</span>
                                      <span>{doc.name}</span>
                                      <span className={`px-2 py-1 text-xs rounded ${
                                        doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                                        doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                        'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {doc.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-500">No documents uploaded</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleVerifyVendor(vendor.id, true)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleVerifyVendor(vendor.id, false)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            Reject
                          </button>
                          <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                            Request More Info
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">System Notifications</h3>
                  
                  <div className="space-y-3">
                    {notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border ${
                          notification.isRead ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-lg ${
                              notification.priority === 'urgent' ? 'bg-red-100' :
                              notification.priority === 'high' ? 'bg-orange-100' :
                              notification.priority === 'medium' ? 'bg-yellow-100' :
                              'bg-blue-100'
                            }`}>
                              <span className="text-lg">
                                {notification.type === 'verification_request' ? '✅' :
                                 notification.type === 'payment_issue' ? '💰' :
                                 notification.type === 'user_complaint' ? '😡' : '⚠️'}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{notification.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                              <div className="flex items-center space-x-4 mt-2">
                                <span className="text-xs text-gray-500">
                                  {notification.createdAt.toLocaleDateString()}
                                </span>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  notification.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                  notification.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                  notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {notification.priority}
                                </span>
                                {notification.actionRequired && (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                    Action Required
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {!notification.isRead && (
                              <button
                                onClick={() => handleMarkNotificationRead(notification.id)}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Mark Read
                              </button>
                            )}
                            <button className="text-gray-400 hover:text-gray-600">
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 