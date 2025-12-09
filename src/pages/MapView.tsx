import React, { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { AndhraPradeshMap } from '../components/AndhraPradeshMap';
import { ErrorBoundary } from '../components/ErrorBoundary';

export const MapView: React.FC = () => {
  // Memoize to prevent unnecessary re-renders
  const mapComponent = useMemo(() => <AndhraPradeshMap />, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MapPin className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Andhra Pradesh</h1>
            <p className="text-sm text-gray-600 mt-1">Interactive map showing all districts with hover and click functionality</p>
          </div>
        </div>
      </div>

      <ErrorBoundary>
        {mapComponent}
      </ErrorBoundary>
    </div>
  );
};

