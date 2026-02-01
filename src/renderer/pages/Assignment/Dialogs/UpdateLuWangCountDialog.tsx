// src/components/Dialogs/UpdateLuWangCountDialog.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  X,
  BarChart3,
  Save,
  Loader2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calculator,
  Plus,
  Minus,
  Divide,
  Percent,
} from "lucide-react";
import { showError, showSuccess } from "../../../utils/notification";
import assignmentAPI from "../../../apis/assignment";
import { dialogs } from "../../../utils/dialogs";
import { formatDecimalForInput } from "../utils/formats";
interface UpdateLuWangCountDialogProps {
  assignmentId: number;
  assignmentName: string;
  currentLuWang: string;
  workerName?: string;
  pitakName?: string;
  assignmentDate?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const UpdateLuWangCountDialog: React.FC<UpdateLuWangCountDialogProps> = ({
  assignmentId,
  assignmentName,
  currentLuWang,
  workerName,
  pitakName,
  assignmentDate,
  onClose,
  onSuccess,
}) => {
  // Parse initial value as float
  const initialLuWang = parseFloat(currentLuWang) || 0;

  const [luwangCount, setLuwangCount] = useState<number>(initialLuWang);
  const [inputValue, setInputValue] = useState<string>(
    formatDecimalForInput(initialLuWang),
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    statistics?: any;
    recommendations?: any[];
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Format decimal for display with commas
  const formatDecimal = (num: number): string => {
    if (isNaN(num) || num === undefined || num === null) return "0.00";

    return new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
      useGrouping: true,
    }).format(num);
  };

  // Parse string to float
  const parseDecimal = (str: string): number => {
    const cleaned = str.replace(/,/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Allow: numbers, decimal point, and empty string
    if (value === "") {
      setInputValue("");
      setLuwangCount(0);
      return;
    }

    // Check if the input is valid (only numbers and one decimal point)
    const decimalCount = (value.match(/\./g) || []).length;
    if (decimalCount > 1) return;

    // Check if the character after decimal is valid (2 digits max)
    const parts = value.split(".");
    if (parts.length === 2 && parts[1].length > 4) return;

    // Check if it's a valid number
    const num = parseDecimal(value);
    if (!isNaN(num)) {
      setInputValue(value);
      setLuwangCount(num);
    }
  };

  // Handle input blur - format the value
  const handleInputBlur = () => {
    if (inputValue === "") {
      setInputValue("0.00");
      setLuwangCount(0);
      return;
    }

    const num = parseDecimal(inputValue);
    if (!isNaN(num)) {
      setInputValue(num.toFixed(2));
      setLuwangCount(num);
    }
  };

  // Validate the new LuWang count
  const validateLuWangCount = async () => {
    if (Math.abs(luwangCount - initialLuWang) < 0.001) {
      setValidationResult(null);
      return;
    }

    setValidating(true);
    setError(null);

    try {
      const response = await assignmentAPI.validateLuWangCount(
        luwangCount,
        assignmentId,
      );

      if (response.status) {
        setValidationResult(response.data);
      } else {
        setError(response.message || "Validation failed");
      }
    } catch (err: any) {
      console.error("Validation error:", err);
      setValidationResult({
        isValid: true,
        errors: [],
        warnings: [],
        statistics: null,
        recommendations: [],
      });
    } finally {
      setValidating(false);
    }
  };

  // Auto-validate when LuWang count changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (Math.abs(luwangCount - initialLuWang) > 0.001) {
        validateLuWangCount();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [luwangCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (Math.abs(luwangCount - initialLuWang) < 0.001) {
      setError("LuWang count is unchanged");
      return;
    }

    if (luwangCount < 0) {
      setError("LuWang count cannot be negative");
      return;
    }

    if (validationResult && !validationResult.isValid) {
      setError("Please fix validation errors before saving");
      return;
    }

    if (
      !(await dialogs.confirm({
        title: "Update LuWang Count",
        message: `Are you sure you want to update the LuWang count from ${formatDecimal(initialLuWang)} to ${formatDecimal(luwangCount)}?`,
      }))
    )
      return;

    setLoading(true);
    setError(null);

    try {
      const response = await assignmentAPI.updateLuWangCount(
        assignmentId,
        luwangCount,
        notes,
      );

      if (response.status) {
        showSuccess(
          `LuWang count updated from ${formatDecimal(initialLuWang)} to ${formatDecimal(luwangCount)}`,
        );
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(response.message || "Failed to update LuWang count");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update LuWang count");
      showError("Failed to update LuWang count");
    } finally {
      setLoading(false);
    }
  };

  const calculateChange = (): number => {
    if (Math.abs(initialLuWang) < 0.001) return 0;
    return ((luwangCount - initialLuWang) / Math.abs(initialLuWang)) * 100;
  };

  const changePercentage = calculateChange();
  const changeAmount = luwangCount - initialLuWang;
  const isIncrease = changeAmount > 0.001;
  const isDecrease = changeAmount < -0.001;
  const hasChanged = Math.abs(changeAmount) > 0.001;

  // Quick adjustment buttons
  const quickAdjustments = [
    { label: "+0.5", value: 0.5, icon: Plus },
    { label: "+1.0", value: 1.0, icon: Plus },
    { label: "+5.0", value: 5.0, icon: Plus },
    { label: "+10.0", value: 10.0, icon: Plus },
    { label: "×2", value: initialLuWang, icon: BarChart3 },
    { label: "÷2", value: -initialLuWang / 2, icon: Divide },
  ];

  const handleQuickAdjust = (adjustment: number, label: string) => {
    let newValue: number;

    if (label === "×2") {
      newValue = initialLuWang * 2;
    } else if (label === "÷2") {
      newValue = initialLuWang / 2;
    } else {
      newValue = luwangCount + adjustment;
    }

    // Ensure new value is not negative
    if (newValue < 0) newValue = 0;

    setLuwangCount(newValue);
    setInputValue(newValue.toFixed(2));

    // Focus the input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Reset to original value
  const handleReset = () => {
    setLuwangCount(initialLuWang);
    setInputValue(formatDecimalForInput(initialLuWang));
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e as any);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div
        className="bg-white rounded-lg w-full max-w-2xl shadow-2xl border border-gray-300"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-300 flex items-center justify-between bg-gradient-to-r from-amber-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Update LuWang Count
              </h3>
              <p className="text-sm text-gray-600">{assignmentName}</p>
            </div>
          </div>
          <button
            onClick={async () => {
              if (
                !(await dialogs.confirm({
                  title: "Cancel Update",
                  message: "Are you sure you want to cancel this update?",
                }))
              )
                return;
              onClose();
            }}
            className="w-8 h-8 rounded flex items-center justify-center hover:bg-gray-200 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-600">{error}</p>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Current Info & Input */}
            <div className="space-y-6">
              {/* Current LuWang Count */}
              <div className="p-5 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Current LuWang
                </h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatDecimal(initialLuWang)}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({initialLuWang.toFixed(4)} raw)
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Assignment Date:
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {assignmentDate || "Not specified"}
                    </span>
                  </div>
                  {workerName && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Worker:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {workerName}
                      </span>
                    </div>
                  )}
                  {pitakName && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Pitak:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {pitakName}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* New LuWang Count Input */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  New LuWang Count
                  <span className="ml-2 text-xs text-gray-500">
                    (Decimal values supported)
                  </span>
                </label>

                <div className="relative flex items-center">
                  {/* Left icon */}
                  <div className="absolute left-3">
                    <Calculator className="w-5 h-5 text-gray-400" />
                  </div>

                  {/* Input field with right margin */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className="w-full pl-10 pr-4 mr-14 py-3 border border-gray-300 rounded-lg 
                 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 
                 text-lg font-medium bg-white"
                    placeholder="0.00"
                    disabled={loading}
                    autoFocus
                  />

                  {/* Right quick adjust (+1/-1) */}
                  <div className="absolute right-3 flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleQuickAdjust(1, "+1")}
                      className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 
                   rounded text-xs font-semibold"
                      title="Add 1"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAdjust(-1, "-1")}
                      className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 
                   rounded text-xs font-semibold"
                      title="Subtract 1"
                    >
                      -1
                    </button>
                  </div>
                </div>

                {/* Quick Adjustments Grid */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">
                    Quick Adjustments
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {quickAdjustments.map((adjustment, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() =>
                          handleQuickAdjust(adjustment.value, adjustment.label)
                        }
                        className="px-3 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 
                     text-gray-700 rounded-md transition-colors flex items-center justify-center gap-1"
                      >
                        {adjustment.icon && (
                          <adjustment.icon className="w-4 h-4" />
                        )}
                        {adjustment.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Change Summary & Notes */}
            <div className="space-y-6">
              {/* Change Indicator */}
              {hasChanged && (
                <div
                  className={`p-5 rounded-lg border ${
                    isIncrease
                      ? "bg-green-50 border-green-200"
                      : isDecrease
                        ? "bg-red-50 border-red-200"
                        : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {isIncrease && (
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      )}
                      {isDecrease && (
                        <TrendingDown className="w-6 h-6 text-red-600" />
                      )}
                      <span className="text-base font-semibold">
                        {isIncrease
                          ? "Increase"
                          : isDecrease
                            ? "Decrease"
                            : "No change"}
                      </span>
                    </div>
                    <div
                      className={`text-2xl font-bold ${
                        isIncrease
                          ? "text-green-600"
                          : isDecrease
                            ? "text-red-600"
                            : "text-gray-600"
                      }`}
                    >
                      {isIncrease ? "+" : ""}
                      {formatDecimal(changeAmount)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Old Value</p>
                      <p className="text-base font-medium">
                        {formatDecimal(initialLuWang)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">New Value</p>
                      <p className="text-base font-medium">
                        {formatDecimal(luwangCount)}
                      </p>
                    </div>
                    {Math.abs(initialLuWang) > 0.001 && (
                      <>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">Percentage</p>
                          <p
                            className={`text-base font-medium ${
                              isIncrease
                                ? "text-green-600"
                                : isDecrease
                                  ? "text-red-600"
                                  : "text-gray-600"
                            }`}
                          >
                            {isIncrease ? "+" : ""}
                            {changePercentage.toFixed(2)}%
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">Status</p>
                          <p
                            className={`text-base font-medium ${
                              Math.abs(changePercentage) > 50
                                ? "text-red-600"
                                : Math.abs(changePercentage) > 20
                                  ? "text-amber-600"
                                  : "text-green-600"
                            }`}
                          >
                            {Math.abs(changePercentage) > 50
                              ? "Large Change"
                              : Math.abs(changePercentage) > 20
                                ? "Moderate Change"
                                : "Normal Change"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Validation Results */}
              {validating && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <p className="text-sm text-blue-600">
                      Validating LuWang count...
                    </p>
                  </div>
                </div>
              )}

              {validationResult && !validating && (
                <div
                  className={`p-4 rounded-lg border ${
                    validationResult.isValid
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  {validationResult.errors.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-red-700 mb-2">
                        Validation Errors:
                      </p>
                      <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                        {validationResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {validationResult.warnings.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-amber-700 mb-2">
                        Warnings:
                      </p>
                      <ul className="text-sm text-amber-600 list-disc list-inside space-y-1">
                        {validationResult.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {validationResult.isValid &&
                    validationResult.errors.length === 0 && (
                      <p className="text-sm font-medium text-green-600">
                        ✓ LuWang count is valid
                      </p>
                    )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Notes (Optional)
                  <span className="ml-2 text-xs text-gray-500">
                    {notes.length}/500 characters
                  </span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                  placeholder="Add notes about this LuWang count update..."
                  disabled={loading}
                  maxLength={500}
                />

                {/* Quick Notes Suggestions */}
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">
                    Quick suggestions:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Additional work completed",
                      "Estimate adjusted",
                      "Weather conditions",
                      "Extra workers",
                      "Equipment issues",
                      "Work scope increased",
                    ].map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() =>
                          setNotes((prev) =>
                            prev ? `${prev}; ${suggestion}` : suggestion,
                          )
                        }
                        className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                      >
                        + {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-300">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleReset}
                disabled={!hasChanged || loading}
                className="px-4 py-2 rounded text-sm font-medium border border-gray-300 hover:bg-gray-100 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reset to Original
              </button>
              <div className="text-sm text-gray-500">
                Press{" "}
                <kbd className="px-2 py-1 bg-gray-100 rounded border">
                  Ctrl+Enter
                </kbd>{" "}
                to save
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  if (
                    !(await dialogs.confirm({
                      title: "Cancel Update",
                      message: "Are you sure you want to cancel this update?",
                    }))
                  )
                    return;
                  onClose();
                }}
                disabled={loading}
                className="px-5 py-2.5 rounded text-sm font-medium border border-gray-300 hover:bg-gray-100 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  loading ||
                  !hasChanged ||
                  luwangCount < 0 ||
                  (validationResult !== null && !validationResult.isValid)
                }
                className="px-6 py-2.5 rounded text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Update
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateLuWangCountDialog;
