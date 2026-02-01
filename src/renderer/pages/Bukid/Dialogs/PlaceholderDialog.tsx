// src/components/Dialogs/PlaceholderDialog.tsx
import React from 'react';
import { X, AlertCircle, Clock } from 'lucide-react';

interface PlaceholderDialogProps {
  title: string;
  message: string;
  featureName: string;
  onClose: () => void;
}

const PlaceholderDialog: React.FC<PlaceholderDialogProps> = ({
  title,
  message,
  featureName,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl border border-gray-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-amber-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-amber-100 to-amber-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              {featureName} Coming Soon
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              {message}
            </p>
            <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
              <p>This feature is currently under development and will be available in the next update.</p>
            </div>
          </div>

          {/* Features List */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h5 className="text-sm font-medium text-gray-900 mb-3">Planned Features:</h5>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                Enhanced data visualization
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                Batch processing capabilities
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                Advanced filtering options
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                Export/import functionality
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-sm font-medium bg-gray-600 hover:bg-gray-700 text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderDialog;