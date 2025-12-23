'use client';

import { useState } from 'react';
import { Shield, Lock, Eye, Trash2 } from 'lucide-react';

export default function PrivacySettingsPage() {
  const [settings, setSettings] = useState({
    profileVisibility: 'public',
    showEmail: true,
    showPhone: false,
    dataSharing: false,
  });

  const handleUpdate = async (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
    // TODO: Save to backend
    alert('Privacy settings updated');
  };

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Privacy & Security</h1>
        <p className="text-muted-foreground mt-2">
          Control your privacy settings and data sharing preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Visibility */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Profile Visibility</h2>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={settings.profileVisibility === 'public'}
                onChange={(e) => handleUpdate('profileVisibility', e.target.value)}
                className="w-4 h-4"
              />
              <span>Public - Anyone can see your profile</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={settings.profileVisibility === 'private'}
                onChange={(e) => handleUpdate('profileVisibility', e.target.value)}
                className="w-4 h-4"
              />
              <span>Private - Only you can see your profile</span>
            </label>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Contact Information</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span>Show email address</span>
              <input
                type="checkbox"
                checked={settings.showEmail}
                onChange={(e) => handleUpdate('showEmail', e.target.checked)}
                className="w-4 h-4"
              />
            </label>
            <label className="flex items-center justify-between">
              <span>Show phone number</span>
              <input
                type="checkbox"
                checked={settings.showPhone}
                onChange={(e) => handleUpdate('showPhone', e.target.checked)}
                className="w-4 h-4"
              />
            </label>
          </div>
        </div>

        {/* Data Sharing */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Data Sharing</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Allow Bookiji to use your data for improving services and analytics.
          </p>
          <label className="flex items-center justify-between">
            <span>Enable data sharing</span>
            <input
              type="checkbox"
              checked={settings.dataSharing}
              onChange={(e) => handleUpdate('dataSharing', e.target.checked)}
              className="w-4 h-4"
            />
          </label>
        </div>

        {/* Account Deletion */}
        <div className="bg-white rounded-lg shadow-sm p-6 border-red-200">
          <div className="flex items-center gap-3 mb-4">
            <Trash2 className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-semibold text-red-900">Danger Zone</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Permanently delete your account and all associated data.
          </p>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                alert('Account deletion feature coming soon');
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}








