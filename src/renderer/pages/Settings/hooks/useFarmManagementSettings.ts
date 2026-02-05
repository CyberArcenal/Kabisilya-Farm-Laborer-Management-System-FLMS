import { useState, useEffect, useCallback, useMemo } from "react";
import systemConfigAPI, {
  type FarmSessionSettings,
  type FarmBukidSettings,
  type FarmPitakSettings,
  type FarmAssignmentSettings,
  type FarmPaymentSettings,
  type FarmDebtSettings,
  type FarmAuditSettings,
} from "../../../apis/system_config";
import { showError, showSuccess } from "../../../utils/notification";

interface FarmManagementSettings {
  farm_session: FarmSessionSettings;
  farm_bukid: FarmBukidSettings;
  farm_pitak: FarmPitakSettings;
  farm_assignment: FarmAssignmentSettings;
  farm_payment: FarmPaymentSettings;
  farm_debt: FarmDebtSettings;
  farm_audit: FarmAuditSettings;
}

interface UseFarmManagementSettingsReturn {
  settings: FarmManagementSettings | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  saveSuccess: boolean;
  saveError: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (
    newSettings: Partial<FarmManagementSettings>,
  ) => Promise<void>;
  updateFormSettings: (
    category: keyof FarmManagementSettings,
    newSettings: any,
  ) => void;
  resetForm: () => void;
  hasChanges: boolean;
}

// Enhanced deep comparison utility function with type normalization
const deepEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;

  // Handle primitive types and null/undefined
  if (obj1 == null || obj2 == null) {
    // For boolean-like comparisons, treat undefined/null/false as equivalent
    if ((obj1 == null && obj2 === false) || (obj1 === false && obj2 == null)) {
      return true;
    }
    return obj1 == obj2;
  }

  if (typeof obj1 !== "object" || typeof obj2 !== "object") {
    // Handle number/string comparisons
    if (typeof obj1 === "number" && typeof obj2 === "number") {
      // Special case for 0 and empty values
      if ((obj1 === 0 && !obj2) || (obj2 === 0 && !obj1)) {
        return false;
      }
    }
    return obj1 === obj2;
  }

  // Handle array comparisons
  if (Array.isArray(obj1) !== Array.isArray(obj2)) {
    return false;
  }

  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i])) return false;
    }
    return true;
  }

  // Handle object comparisons
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  // Get all unique keys
  const allKeys = new Set([...keys1, ...keys2]);

  for (const key of allKeys) {
    const val1 = obj1[key];
    const val2 = obj2[key];

    if (!deepEqual(val1, val2)) {
      return false;
    }
  }

  return true;
};

// Function to ensure all boolean fields have consistent values
const normalizeBooleanFields = (settings: any): any => {
  if (!settings || typeof settings !== "object") return settings;

  const normalized = { ...settings };

  // List of known boolean fields across all settings categories
  const booleanFields = [
    // Session settings
    "require_default_session",

    // Bukid settings
    "enable_location_descriptor",
    "location_required",

    // Pitak settings
    "require_location",

    // Assignment settings
    "enable_notes_remarks",

    // Payment settings
    // (wala na tayong boolean dito dahil rate_per_luwang lang ang laman)

    // Debt settings
    "require_debt_reason",
    "auto_apply_interest",

    // Audit settings
    "logActionsEnabled",
    "enableRealTimeLogging",
    "notifyOnCriticalEvents",
  ];

  // Recursively normalize objects and arrays
  const normalizeRecursive = (obj: any): any => {
    if (!obj || typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => normalizeRecursive(item));
    }

    const result = { ...obj };

    for (const key in result) {
      if (booleanFields.includes(key)) {
        // Ensure boolean fields are boolean, not undefined/null
        if (result[key] == null) {
          result[key] = false;
        } else {
          result[key] = Boolean(result[key]);
        }
      } else if (typeof result[key] === "object") {
        result[key] = normalizeRecursive(result[key]);
      }
    }

    return result;
  };

  return normalizeRecursive(normalized);
};

export const useFarmManagementSettings =
  (): UseFarmManagementSettingsReturn => {
    const [settings, setSettings] = useState<FarmManagementSettings | null>(
      null,
    );
    const [originalSettings, setOriginalSettings] =
      useState<FarmManagementSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const fetchSettings = useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await systemConfigAPI.getGroupedConfig();

        if (response.status && response.data?.grouped_settings) {
          const grouped = response.data.grouped_settings;

          const farmSettings = {
            farm_session: grouped.farm_session || {},
            farm_bukid: grouped.farm_bukid || {},
            farm_pitak: grouped.farm_pitak || {},
            farm_assignment: grouped.farm_assignment || {},
            farm_payment: grouped.farm_payment || {},
            farm_debt: grouped.farm_debt || {},
            farm_audit: grouped.farm_audit || {},
          };

          // Normalize boolean fields
          const normalizedSettings = normalizeBooleanFields(farmSettings);

          setSettings(normalizedSettings);
          setOriginalSettings(JSON.parse(JSON.stringify(normalizedSettings)));
        } else {
          throw new Error(response.message || "Failed to fetch farm settings");
        }
      } catch (err: any) {
        console.error("Error fetching farm settings:", err);
        setError(err.message || "An error occurred while fetching settings");

        const defaultSettings = {
          farm_session: {},
          farm_bukid: {},
          farm_pitak: {},
          farm_assignment: {},
          farm_payment: {},
          farm_debt: {},
          farm_audit: {},
        };

        const normalizedDefaults = normalizeBooleanFields(defaultSettings);
        setSettings(normalizedDefaults);
        setOriginalSettings(JSON.parse(JSON.stringify(normalizedDefaults)));
      } finally {
        setLoading(false);
      }
    }, []);

    const updateFormSettings = useCallback(
      (category: keyof FarmManagementSettings, newSettings: any) => {
        setSettings((prev) => {
          if (!prev) return prev;

          // Normalize new settings before updating
          const normalizedNewSettings = normalizeBooleanFields(newSettings);

          return {
            ...prev,
            [category]: { ...prev[category], ...normalizedNewSettings },
          };
        });
      },
      [],
    );

    const updateSettings = async (
      newSettings: Partial<FarmManagementSettings>,
    ) => {
      try {
        setSaving(true);
        setSaveSuccess(false);
        setSaveError(null);

        console.log("Updating farm settings:", newSettings);

        const response = await systemConfigAPI.updateGroupedConfig(newSettings);

        if (response.status) {
          const updatedSettings = { ...settings!, ...newSettings };

          // Normalize the updated settings
          const normalizedSettings = normalizeBooleanFields(updatedSettings);

          setSettings(normalizedSettings);
          setOriginalSettings(JSON.parse(JSON.stringify(normalizedSettings)));
          setSaveSuccess(true);

          showSuccess("Farm settings saved successfully!");

          setTimeout(() => fetchSettings(), 500);
        } else {
          throw new Error(response.message || "Failed to update settings");
        }
      } catch (err: any) {
        console.error("Error updating farm settings:", err);
        setSaveError(err.message || "An error occurred while saving settings");
        showError("Failed to save farm settings");
      } finally {
        setSaving(false);
      }
    };

    const resetForm = useCallback(() => {
      if (originalSettings) {
        // Use normalized settings when resetting
        const normalizedReset = normalizeBooleanFields(originalSettings);
        setSettings(JSON.parse(JSON.stringify(normalizedReset)));
      }
      setSaveSuccess(false);
      setSaveError(null);
      showSuccess("Settings reset to original values");
    }, [originalSettings]);

    const hasChanges = useMemo(() => {
      if (!settings || !originalSettings) {
        return false;
      }

      // Normalize both settings before comparison
      const normalizedSettings = normalizeBooleanFields(settings);
      const normalizedOriginal = normalizeBooleanFields(originalSettings);

      return !deepEqual(normalizedSettings, normalizedOriginal);
    }, [settings, originalSettings]);

    useEffect(() => {
      fetchSettings();
    }, [fetchSettings]);

    return {
      settings,
      loading,
      error,
      saving,
      saveSuccess,
      saveError,
      fetchSettings,
      updateSettings,
      updateFormSettings,
      resetForm,
      hasChanges,
    };
  };
