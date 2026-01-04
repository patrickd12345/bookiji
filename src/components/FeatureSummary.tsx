'use client';

export default function FeatureSummary() {
  const features = [
    { name: 'AI Radius Scaling', status: 'completed' },
    { name: 'Map Abstraction', status: 'completed' },
    { name: 'Customer Personas', status: 'completed' },
    { name: 'Commitment Fee', status: 'completed' },
    { name: 'AI Conversational', status: 'completed' },
    { name: 'Commitment + Handoff', status: 'completed' }
  ];

  return (
    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">🎯 Bookiji Features Implemented</h4>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {features.map((feature) => (
          <div key={feature.name} className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${
              feature.status === 'completed' ? 'bg-green-500' : 'bg-gray-400'
            }`}></span>
            <span>{feature.name}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-gray-600">
        <strong>Demo:</strong> Use buttons above to test each feature
      </div>
    </div>
  );
} 