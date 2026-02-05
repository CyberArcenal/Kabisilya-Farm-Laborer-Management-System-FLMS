// components/Session/Dialogs/SessionFormDialog.tsx
import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Calendar,
  AlertCircle,
  Loader,
  CheckCircle,
  Info,
  CalendarDays,
  Clock,
} from "lucide-react";
import sessionAPI from "../../../apis/session";
import { dialogs } from "../../../utils/dialogs";
import { showSuccess, showError } from "../../../utils/notification";

interface SessionFormDialogProps {
  id?: number;
  mode: "add" | "edit";
  onClose: () => void;
  onSuccess?: (session: any) => void;
}

interface FormData {
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  seasonType: string;
  status: "active" | "closed" | "archived";
}

const SessionFormDialog: React.FC<SessionFormDialogProps> = ({
  id,
  mode,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    year: currentYear,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    seasonType: "tag-ulan",
    status: "active",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    isUnique: boolean;
    message: string;
  }>({
    isValid: false,
    isUnique: false,
    message: "",
  });

  // Fetch initial data for edit mode
  useEffect(() => {
    const fetchData = async () => {
      if (mode === "edit" && id) {
        try {
          setLoading(true);
          const response = await sessionAPI.getById(id);

          if (response.status && response.data) {
            const session = response.data;
            setFormData({
              name: session.name,
              year: session.year,
              startDate: session.startDate.split("T")[0],
              endDate: session.endDate ? session.endDate.split("T")[0] : "",
              seasonType: session.seasonType || "tag-ulan",
              status: session.status,
            });
          } else {
            showError("Session not found");
            onClose();
          }
        } catch (error) {
          console.error("Error fetching session:", error);
          showError("Failed to load session data");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [id, mode, onClose]);

  // Handle form input changes with validation
  const handleChange = async (
    field: keyof FormData,
    value: string | number,
  ) => {
    const newFormData = {
      ...formData,
      [field]: value,
    };
    setFormData(newFormData);

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }

    // Validate name in real-time
    if (
      field === "name" &&
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      try {
        setValidating(true);
        // Validate format
        const formatValidation = await sessionAPI.validateName(value);

        // Only check uniqueness if format is valid
        if (formatValidation.data) {
          const uniqueValidation = await sessionAPI.checkNameExists(
            value,
            newFormData.year,
            mode === "edit" ? id : undefined,
          );

          setValidationState({
            isValid: formatValidation.data,
            isUnique: uniqueValidation.status ? uniqueValidation.data : true, // Default to true if validation fails
            message: formatValidation.data
              ? uniqueValidation.status
                ? uniqueValidation.data
                  ? "Name is available"
                  : "Name already exists for this year"
                : "Could not verify uniqueness"
              : formatValidation.message,
          });
        } else {
          setValidationState({
            isValid: formatValidation.data,
            isUnique: false,
            message: formatValidation.message,
          });
        }
      } catch (error) {
        console.error("Validation error:", error);
        setValidationState({
          isValid: false,
          isUnique: true, // Default to available on error
          message: "Error validating name",
        });
      } finally {
        setValidating(false);
      }
    } else {
      setValidationState({
        isValid: false,
        isUnique: false,
        message: "",
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Session name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (formData.name.trim().length > 100) {
      newErrors.name = "Name must be less than 100 characters";
    }

    if (!formData.year || formData.year < 2000 || formData.year > 2100) {
      newErrors.year = "Year must be between 2000 and 2100";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }

    if (
      formData.endDate &&
      new Date(formData.endDate) < new Date(formData.startDate)
    ) {
      newErrors.endDate = "End date cannot be before start date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showError("Please fix the errors in the form");
      return;
    }

    // Final uniqueness check
    if (mode === "add") {
      try {
        const uniqueValidation = await sessionAPI.checkNameExists(
          formData.name.trim(),
          formData.year,
        );

        if (uniqueValidation.status && !uniqueValidation.data) {
          showError("Session with this name and year already exists");
          return;
        }
      } catch (error) {
        console.error("Error checking name uniqueness:", error);
        // Continue anyway if check fails
      }
    }

    if (
      !(await dialogs.confirm({
        title: mode === "add" ? "Create Session" : "Update Session",
        message: `Are you sure you want to ${mode === "add" ? "create" : "update"} this session?`,
      }))
    )
      return;

    try {
      setSubmitting(true);
      let response;

      const sessionData = {
        name: formData.name.trim(),
        year: formData.year,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        seasonType: formData.seasonType,
        status: formData.status,
      };

      if (mode === "add") {
        // Create new session
        response = await sessionAPI.create(
          sessionData.name,
          sessionData.year,
          sessionData.startDate,
          sessionData.seasonType,
          sessionData.endDate || undefined,
          sessionData.status,
        );
      } else if (mode === "edit" && id) {
        // Update existing session
        response = await sessionAPI.update(id, sessionData);
      }

      if (response?.status && response.data) {
        showSuccess(
          mode === "add"
            ? "Session created successfully!"
            : "Session updated successfully!",
        );

        if (onSuccess) {
          onSuccess(response.data);
        }
        onClose();
      } else {
        throw new Error(response?.message || "Failed to save session");
      }
    } catch (error: any) {
      console.error("Error submitting form:", error);
      showError(error.message || "Failed to save session");
    } finally {
      setSubmitting(false);
    }
  };

  // Generate year options (current year ± 10 years)
  const yearOptions = Array.from(
    { length: 21 },
    (_, i) => currentYear - 10 + i,
  );

  // Check if form is ready for submission
  const isFormValid = () => {
    if (!formData.name.trim() || !formData.startDate) return false;
    if (errors.name || errors.year || errors.startDate) return false;
    if (
      mode === "add" &&
      (!validationState.isValid || !validationState.isUnique)
    )
      return false;
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-lg border border-gray-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {mode === "add" ? "Create New Session" : "Edit Session"}
              </h3>
              <div className="text-xs text-gray-600">
                {mode === "add"
                  ? "Add a new farming season"
                  : "Update session details"}
              </div>
            </div>
          </div>
          <button
            onClick={async () => {
              if (
                !(await dialogs.confirm({
                  title: "Close Form",
                  message:
                    "Are you sure you want to close the form? Unsaved changes will be lost.",
                }))
              )
                return;
              onClose();
            }}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 transition-colors"
            title="Close"
            disabled={submitting}
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-sm text-gray-600">Loading session data...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field */}
              <div>
                <label
                  className="block text-xs font-medium mb-1.5 text-gray-700"
                  htmlFor="name"
                >
                  Session Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className={`w-full px-3 py-2 rounded text-sm border ${
                      errors.name
                        ? "border-red-500"
                        : formData.name &&
                            validationState.isValid &&
                            validationState.isUnique
                          ? "border-green-500"
                          : "border-gray-300"
                    } focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none pr-10`}
                    placeholder="Enter session name (e.g., Main Season 2024)"
                    required
                    disabled={submitting}
                    maxLength={100}
                  />
                  {validating && (
                    <div className="absolute right-3 top-2.5">
                      <Loader className="w-3.5 h-3.5 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Validation Feedback */}
                {formData.name && !validating && (
                  <div className="mt-2 flex items-center gap-1.5">
                    {validationState.isValid && validationState.isUnique ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-xs text-green-600">
                          {validationState.message}
                        </span>
                      </>
                    ) : validationState.message ? (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs text-amber-600">
                          {validationState.message}
                        </span>
                      </>
                    ) : null}
                  </div>
                )}

                {errors.name && (
                  <p className="mt-1 text-xs flex items-center gap-1 text-red-600">
                    <AlertCircle className="w-3 h-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Year Field */}
              <div>
                <label
                  className="block text-xs font-medium mb-1.5 text-gray-700"
                  htmlFor="year"
                >
                  Year <span className="text-red-500">*</span>
                </label>
                <select
                  id="year"
                  value={formData.year}
                  onChange={(e) =>
                    handleChange("year", parseInt(e.target.value))
                  }
                  className={`w-full px-3 py-2 rounded text-sm border ${
                    errors.year ? "border-red-500" : "border-gray-300"
                  } focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none`}
                  disabled={submitting}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                {errors.year && (
                  <p className="mt-1 text-xs flex items-center gap-1 text-red-600">
                    <AlertCircle className="w-3 h-3" />
                    {errors.year}
                  </p>
                )}
              </div>

              {/* Season Type Field */}
              <div>
                <label
                  className="block text-xs font-medium mb-1.5 text-gray-700"
                  htmlFor="seasonType"
                >
                  Season Type
                </label>
                <select
                  id="seasonType"
                  value={formData.seasonType}
                  onChange={(e) => handleChange("seasonType", e.target.value)}
                  className="w-full px-3 py-2 rounded text-sm border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  disabled={submitting}
                >
                  <option value="tag-ulan">Tag-ulan (Rainy Season)</option>
                  <option value="tag-araw">Tag-araw (Dry Season)</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Date Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5 text-gray-700"
                    htmlFor="startDate"
                  >
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleChange("startDate", e.target.value)}
                    className={`w-full px-3 py-2 rounded text-sm border ${
                      errors.startDate ? "border-red-500" : "border-gray-300"
                    } focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none`}
                    required
                    disabled={submitting}
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-xs flex items-center gap-1 text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      {errors.startDate}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className="block text-xs font-medium mb-1.5 text-gray-700"
                    htmlFor="endDate"
                  >
                    End Date (Optional)
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleChange("endDate", e.target.value)}
                    className={`w-full px-3 py-2 rounded text-sm border ${
                      errors.endDate ? "border-red-500" : "border-gray-300"
                    } focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none`}
                    disabled={submitting}
                    min={formData.startDate}
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-xs flex items-center gap-1 text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      {errors.endDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Field (only for edit mode) */}
              {mode === "edit" && (
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5 text-gray-700"
                    htmlFor="status"
                  >
                    Status
                  </label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) =>
                      handleChange("status", e.target.value as any)
                    }
                    className="w-full px-3 py-2 rounded text-sm border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    disabled={submitting}
                  >
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              )}

              {/* Information Section */}
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="text-xs text-blue-700">
                    <p className="font-medium mb-1">What is a Session?</p>
                    <p>A session represents a farming season that organizes:</p>
                    <ul className="list-disc list-inside mt-1 ml-1">
                      <li>Time period for farming activities</li>
                      <li>Farm plots (bukids) for the season</li>
                      <li>Worker assignments and schedules</li>
                      <li>Payments and debts tracking</li>
                      <li>Seasonal productivity analysis</li>
                    </ul>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>
                Fields marked with <span className="text-red-500">*</span> are
                required
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (
                    !(await dialogs.confirm({
                      title: "Close Form",
                      message:
                        "Are you sure you want to close the form? Unsaved changes will be lost.",
                    }))
                  )
                    return;
                  onClose();
                }}
                className="px-3 py-1.5 rounded text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={submitting || !isFormValid()}
                className="px-3 py-1.5 rounded text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                    {mode === "add" ? "Creating..." : "Updating..."}
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    {mode === "add" ? "Create Session" : "Update Session"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionFormDialog;
