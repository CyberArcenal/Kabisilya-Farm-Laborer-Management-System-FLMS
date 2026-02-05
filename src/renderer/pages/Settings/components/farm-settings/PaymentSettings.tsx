import React from 'react';
import type { FarmPaymentSettings } from '../../../../apis/system_config';

interface PaymentSettingsProps {
  settings: FarmPaymentSettings;
  onChange: (field: keyof FarmPaymentSettings, value: any) => void;
}

export const PaymentSettings: React.FC<PaymentSettingsProps> = ({ 
  settings, 
  onChange 
}) => {
  const updateField = (field: keyof FarmPaymentSettings, value: any) => {
    onChange(field, value);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rate per Luwang
          </label>
          <input
            type="number"
            step="0.01"
            value={settings.rate_per_luwang || 0}
            onChange={(e) => updateField('rate_per_luwang', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};