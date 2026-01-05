
import CalendarSyncStatus from '@/components/CalendarSyncStatus';

export default function CalendarSyncPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Sync Status</h1>
          <p className="text-gray-600">Manage your external calendar connections</p>
        </div>
        <CalendarSyncStatus />
      </div>
    </div>
  );
}
