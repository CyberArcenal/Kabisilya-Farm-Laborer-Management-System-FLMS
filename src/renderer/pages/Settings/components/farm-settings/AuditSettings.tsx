import React from 'react';
import type { FarmAuditSettings } from '../../../../apis/system_config';

interface AuditSettingsProps {
  settings: FarmAuditSettings;
  onChange: (field: keyof FarmAuditSettings, value: any) => void;
}

export const AuditSettings: React.FC<AuditSettingsProps> = ({ 
  settings, 
  onChange 
}) => {
  const updateField = (field: keyof FarmAuditSettings, value: any) => {
    onChange(field, value);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Audit Retention Days
          </label>
          <input
            type="number"
            value={settings.auditRetentionDays || 365}
            onChange={(e) => updateField('auditRetentionDays', parseInt(e.target.value) || 365)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.logActionsEnabled !== false}
            onChange={(e) => updateField('logActionsEnabled', e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Log Actions Enabled</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.enableRealTimeLogging || false}
            onChange={(e) => updateField('enableRealTimeLogging', e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Enable Real-time Logging</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.notifyOnCriticalEvents || false}
            onChange={(e) => updateField('notifyOnCriticalEvents', e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Notify on Critical Events</span>
        </label>
      </div>
    </div>
  );
};