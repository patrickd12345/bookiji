'use client';

import React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import type { AdminStats, AdminAction, AdminNotification } from '@/types/global.d';

export default function AdminCockpit() {
  const { showAdminCockpit, setShowAdminCockpit } = useUIStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [stats] = useState<AdminStats>({
    totalUsers: 1250,
    totalVendors: 450,
    totalBookings: 3200,
    totalRevenue: 125000,
    activeBookings: 180,
    pendingVerifications: 25,
    thisMonth: {
      newUsers: 120,
      newVendors: 45,
      bookings: 450,
      revenue: 18000
    }
  });

  const [notifications] = useState<AdminNotification[]>([
    {
      id: 'notif1',
      type: 'verification_request',
      title: 'New Vendor Verification',
      message: 'A new vendor has requested verification',
      priority: 'high',
      isRead: false,
      createdAt: new Date(),
      actionRequired: true
    }
  ]);

  const [actions] = useState<AdminAction[]>([
    {
      id: 'action1',
      type: 'approve_vendor',
      title: 'Vendor Approval',
      description: 'Review and approve new vendor application',
      priority: 'high',
      status: 'pending',
      dueDate: new Date(Date.now() + 86400000)
    }
  ]);

  if (!showAdminCockpit) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
          <button
            onClick={() => setShowAdminCockpit(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-4 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-2 text-sm font-medium border-b-2 ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`py-4 px-2 text-sm font-medium border-b-2 ${
                activeTab === 'actions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Actions
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-4 px-2 text-sm font-medium border-b-2 ${
                activeTab === 'notifications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Notifications
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
                  <p className="mt-1 text-sm text-green-600">+{stats.thisMonth.newUsers} this month</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500">Total Vendors</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalVendors}</p>
                  <p className="mt-1 text-sm text-green-600">+{stats.thisMonth.newVendors} this month</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500">Total Bookings</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalBookings}</p>
                  <p className="mt-1 text-sm text-green-600">+{stats.thisMonth.bookings} this month</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">${stats.totalRevenue}</p>
                  <p className="mt-1 text-sm text-green-600">+${stats.thisMonth.revenue} this month</p>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500">Active Bookings</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.activeBookings}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500">Pending Verifications</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.pendingVerifications}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-4">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className="bg-white p-4 rounded-lg shadow border border-gray-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{action.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">{action.description}</p>
                      <div className="mt-2 flex items-center space-x-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            action.priority === 'high'
                              ? 'bg-red-100 text-red-800'
                              : action.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {action.priority}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            action.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : action.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {action.status}
                        </span>
                      </div>
                    </div>
                    <button className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Take Action
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-white p-4 rounded-lg shadow border ${
                    notification.isRead ? 'border-gray-200' : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{notification.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">{notification.message}</p>
                      <div className="mt-2 flex items-center space-x-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            notification.priority === 'high'
                              ? 'bg-red-100 text-red-800'
                              : notification.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {notification.priority}
                        </span>
                        {notification.actionRequired && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Action Required
                          </span>
                        )}
                      </div>
                    </div>
                    <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700 font-medium">
                      Mark as Read
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 