import React from 'react';
import type { FarmDebtSettings } from '../../../../apis/system_config';

interface DebtSettingsProps {
  settings: FarmDebtSettings;
  onChange: (field: keyof FarmDebtSettings, value: any) => void;
}

export const DebtSettings: React.FC<DebtSettingsProps> = ({ 
  settings, 
  onChange 
}) => {
  const updateField = (field: keyof FarmDebtSettings, value: any) => {
    onChange(field, value);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Debt Allocation Strategy
          </label>
          <select
            value={settings.debt_allocation_strategy || 'auto'}
            onChange={(e) => updateField('debt_allocation_strategy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="auto">Auto</option>
            <option value="equal">Equal</option>
            <option value="proportional">Proportional</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Interest Rate (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={settings.default_interest_rate || 0}
            onChange={(e) => updateField('default_interest_rate', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Term (Days)
          </label>
          <input
            type="number"
            value={settings.payment_term_days || 0}
            onChange={(e) => updateField('payment_term_days', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Grace Period (Days)
          </label>
          <input
            type="number"
            value={settings.grace_period_days || 0}
            onChange={(e) => updateField('grace_period_days', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Debt Limit
          </label>
          <input
            type="number"
            value={settings.debt_limit || 0}
            onChange={(e) => updateField('debt_limit', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.require_debt_reason || false}
            onChange={(e) => updateField('require_debt_reason', e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Require Debt Reason</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.auto_apply_interest || false}
            onChange={(e) => updateField('auto_apply_interest', e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Auto Apply Interest</span>
        </label>
      </div>
    </div>
  );
};