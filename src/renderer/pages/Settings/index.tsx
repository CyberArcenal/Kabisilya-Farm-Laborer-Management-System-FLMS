import React, { useState, useEffect } from "react";
import {
  Save,
  RefreshCw,
  Download,
  Upload,
  AlertCircle,
  Settings,
  Calendar,
  MapPin,
  CreditCard,
  UserCheck,
  FileText,
  Shield,
} from "lucide-react";
import { useFarmManagementSettings } from "./hooks/useFarmManagementSettings";
import { SessionSettings } from "./components/farm-settings/SessionSettings";
import systemConfigAPI from "../../apis/system_config";
import { PitakSettings } from "./components/farm-settings/PitakSettings";
import { AssignmentSettings } from "./components/farm-settings/AssignmentSettings";
import { PaymentSettings } from "./components/farm-settings/PaymentSettings";
import { DebtSettings } from "./components/farm-settings/DebtSettings";
import { AuditSettings } from "./components/farm-settings/AuditSettings";
import Toast from "./components/Toast";
import { BukidSettings } from "./components/farm-settings/BukidSettings";

const FarmManagementSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("session");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const {
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
  } = useFarmManagementSettings();

  // Show toast notifications
  useEffect(() => {
    if (saveSuccess) {
      setToast({
        message: "Farm settings saved successfully!",
        type: "success",
      });
      setTimeout(() => setToast(null), 3000);
    }
    if (saveError) {
      setToast({
        message: `Failed to save settings: ${saveError}`,
        type: "error",
      });
      setTimeout(() => setToast(null), 5000);
    }
  }, [saveSuccess, saveError]);

  const handleSave = async () => {
    if (!settings) return;

    try {
      await updateSettings(settings);
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleReset = () => {
    resetForm();
    setToast({
      message: "Settings reset to original values",
      type: "info",
    });
    setTimeout(() => setToast(null), 2000);
  };

  const handleRefresh = () => {
    fetchSettings();
    setToast({ message: "Refreshing settings...", type: "info" });
    setTimeout(() => setToast(null), 2000);
  };

  const handleExport = async () => {
    try {
      const jsonData = await systemConfigAPI.exportSettingsToFile();
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "farm-settings.json";
      a.click();
      setToast({ message: "Settings exported successfully", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      setToast({ message: "Failed to export settings", type: "error" });
      setTimeout(() => setToast(null), 5000);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (
      window.confirm(
        "Importing settings will overwrite current settings. Continue?",
      )
    ) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const jsonData = e.target?.result as string;
          await systemConfigAPI.importSettingsFromFile(jsonData);
          setToast({
            message: "Settings imported successfully",
            type: "success",
          });
          setTimeout(() => setToast(null), 3000);
          fetchSettings();
        };
        reader.readAsText(file);
      } catch (error) {
        setToast({ message: "Failed to import settings", type: "error" });
        setTimeout(() => setToast(null), 5000);
      }
    }
  };

  const handleResetToDefaults = async () => {
    if (
      window.confirm("Are you sure you want to reset all settings to defaults?")
    ) {
      try {
        await systemConfigAPI.resetToDefaults();
        setToast({ message: "Settings reset to defaults", type: "success" });
        setTimeout(() => setToast(null), 3000);
        fetchSettings();
      } catch (error) {
        setToast({ message: "Failed to reset settings", type: "error" });
        setTimeout(() => setToast(null), 5000);
      }
    }
  };

  // Render loading state
  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading farm management settings...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
          <h2 className="text-2xl font-bold mb-2 text-gray-800">
            Failed to Load Settings
          </h2>
          <p className="mb-4 text-gray-600">{error}</p>
          <button
            onClick={fetchSettings}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!settings) return null;

  // Tabs configuration
  // Update the tabs array to include all tabs
  const tabs = [
    {
      id: "session",
      label: "Session Settings",
      icon: Calendar,
      color: "text-blue-600",
    },
    {
      id: "bukid",
      label: "Bukid Settings",
      icon: MapPin,
      color: "text-green-600",
    },
    {
      id: "pitak",
      label: "Pitak Settings",
      icon: MapPin,
      color: "text-amber-600",
    },
    {
      id: "assignment",
      label: "Assignment Settings",
      icon: UserCheck,
      color: "text-purple-600",
    },
    {
      id: "payment",
      label: "Payment Settings",
      icon: CreditCard,
      color: "text-emerald-600",
    },
    {
      id: "debt",
      label: "Debt Settings",
      icon: FileText,
      color: "text-red-600",
    },
    {
      id: "audit",
      label: "Audit Settings",
      icon: Shield,
      color: "text-indigo-600",
    },
  ];

  const handleCategoryChange = (
    category: string,
    field: string,
    value: any,
  ) => {
    updateFormSettings(category as any, { [field]: value });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3 text-gray-800">
              <Settings className="w-8 h-8 text-green-600" />
              Farm Management Settings
            </h1>
            <p className="text-gray-600 mt-2">
              Configure farm operations, financial rules, and system behavior
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw
                className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
              />
            </button>

            <button
              onClick={handleExport}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>

            <label className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>

            <button
              onClick={handleReset}
              disabled={!hasChanges || saving}
              className={`px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 flex items-center gap-2 transition-colors ${!hasChanges || saving ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Reset
            </button>

            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors ${!hasChanges || saving ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-blue-500" />
            <span className="text-sm text-gray-600">
              <strong>Note:</strong> Changes affect all farm operations
            </span>
          </div>
          <div className="text-sm">
            <span
              className={`font-medium ${hasChanges ? "text-green-600" : "text-gray-400"}`}
            >
              {hasChanges
                ? "✓ You have unsaved changes"
                : "No changes detected"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? `${tab.color} border-current`
                      : "text-gray-500 border-transparent hover:text-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "session" && (
            <SessionSettings
              settings={settings.farm_session}
              onChange={(field, value) =>
                handleCategoryChange("farm_session", field, value)
              }
            />
          )}

          {activeTab === "bukid" && (
            <BukidSettings
              settings={settings.farm_bukid}
              onChange={(field, value) =>
                handleCategoryChange("farm_bukid", field, value)
              }
            />
          )}

          {activeTab === "pitak" && (
            <PitakSettings
              settings={settings.farm_pitak}
              onChange={(field, value) =>
                handleCategoryChange("farm_pitak", field, value)
              }
            />
          )}

          {activeTab === "assignment" && (
            <AssignmentSettings
              settings={settings.farm_assignment}
              onChange={(field, value) =>
                handleCategoryChange("farm_assignment", field, value)
              }
            />
          )}

          {activeTab === "payment" && (
            <PaymentSettings
              settings={settings.farm_payment}
              onChange={(field, value) =>
                handleCategoryChange("farm_payment", field, value)
              }
            />
          )}

          {activeTab === "debt" && (
            <DebtSettings
              settings={settings.farm_debt}
              onChange={(field, value) =>
                handleCategoryChange("farm_debt", field, value)
              }
            />
          )}

          {activeTab === "audit" && (
            <AuditSettings
              settings={settings.farm_audit}
              onChange={(field, value) =>
                handleCategoryChange("farm_audit", field, value)
              }
            />
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default FarmManagementSettingsPage;
