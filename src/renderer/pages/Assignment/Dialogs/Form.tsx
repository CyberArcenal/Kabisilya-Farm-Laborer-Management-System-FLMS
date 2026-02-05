// AssignmentFormDialog.tsx
import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Users,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader,
  LandPlot,
  User,
  Search,
  Target,
  Check,
  ChevronDown,
  Plus,
  UserX,
} from "lucide-react";
import { showError, showSuccess } from "../../../utils/notification";
import type { Assignment, Worker } from "../../../apis/assignment";
import assignmentAPI from "../../../apis/assignment";
import PitakSelect from "../../../components/Selects/Pitak";
import workerAPI from "../../../apis/worker";

interface AssignmentFormDialogProps {
  onClose: () => void;
  onSuccess?: (assignments: Assignment[]) => void;
}

interface FormData {
  pitakId: number | null;
  assignmentDate: string;
  notes: string;
  workers: Worker[];
}

const AssignmentFormDialog: React.FC<AssignmentFormDialogProps> = ({
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    pitakId: null,
    assignmentDate: new Date().toISOString().split("T")[0],
    notes: "",
    workers: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Worker selection states
  const [searchTerm, setSearchTerm] = useState("");
  const [showWorkerList, setShowWorkerList] = useState(false);
  const [availableWorkers, setAvailableWorkers] = useState<Worker[]>([]);
  const [workerLoading, setWorkerLoading] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);

  // Assignment checking states
  const [assignedToOtherPitaks, setAssignedToOtherPitaks] = useState<
    Map<number, any[]>
  >(new Map());
  const [availableForAssignment, setAvailableForAssignment] = useState<
    number[]
  >([]);
  const [checkingAssignments, setCheckingAssignments] = useState(false);

  // Fetch available workers
  useEffect(() => {
    const fetchWorkers = async () => {
      setWorkerLoading(true);
      setWorkerError(null);
      try {
        const response = await workerAPI.getActiveWorkers({
          limit: 100,
          sortBy: "name",
          sortOrder: "ASC",
        });

        if (response.status) {
          setAvailableWorkers(
            response.data.workers.filter(
              (worker) =>
                worker.status === "active" || worker.status === "on-leave",
            ),
          );
        } else {
          setWorkerError(response.message || "Failed to load workers");
        }
      } catch (err: any) {
        setWorkerError(err.message || "Failed to load workers");
        console.error("Error fetching workers:", err);
      } finally {
        setWorkerLoading(false);
      }
    };

    if (showWorkerList) {
      fetchWorkers();
    }
  }, [showWorkerList]);

  // Check worker assignments when pitak or date changes
  useEffect(() => {
    const checkWorkerAssignments = async () => {
      if (!formData.pitakId || !formData.assignmentDate) return;

      setCheckingAssignments(true);
      const otherPitakAssignments = new Map<number, any[]>();
      const availableWorkersList: number[] = [];

      try {
        // Get assignments for the selected date
        const dateResponse = await assignmentAPI.getAssignmentsByDate(
          formData.assignmentDate,
          {
            status: "active",
          },
        );

        if (dateResponse.status && dateResponse.data) {
          const dateAssignments = dateResponse.data;
          const assignedWorkerIds = new Set<number>();

          // Process assignments for other pitaks
          dateAssignments.forEach((assignment: any) => {
            if (assignment.worker && assignment.worker.id) {
              assignedWorkerIds.add(assignment.worker.id);

              // Skip if it's for this pitak
              if (assignment.pitak?.id === formData.pitakId) return;

              if (!otherPitakAssignments.has(assignment.worker.id)) {
                otherPitakAssignments.set(assignment.worker.id, []);
              }

              otherPitakAssignments.get(assignment.worker.id)?.push({
                assignmentId: assignment.id,
                pitakId: assignment.pitak?.id,
                pitakName: assignment.pitak?.name || "Unknown Pitak",
                pitakCode: assignment.pitak?.code || "N/A",
                status: assignment.status,
                luwangCount: assignment.luwangCount,
                notes: assignment.notes,
              });
            }
          });

          // Find available workers (not assigned to any pitak on this date)
          availableWorkers.forEach((worker) => {
            if (!assignedWorkerIds.has(worker.id)) {
              availableWorkersList.push(worker.id);
            }
          });
        }
      } catch (err) {
        console.error("Error checking worker assignments:", err);
      } finally {
        setAssignedToOtherPitaks(otherPitakAssignments);
        setAvailableForAssignment(availableWorkersList);
        setCheckingAssignments(false);
      }
    };

    if (
      formData.pitakId &&
      formData.assignmentDate &&
      availableWorkers.length > 0
    ) {
      checkWorkerAssignments();
    }
  }, [formData.pitakId, formData.assignmentDate, availableWorkers]);

  // Handle form input changes
  const handleChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  // Filter workers based on search
  const filteredWorkers = availableWorkers.filter((worker) => {
    const matchesSearch =
      worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.email?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Check worker assignment status
  const getWorkerAssignmentStatus = (workerId: number) => {
    const otherAssignments = assignedToOtherPitaks.get(workerId) || [];
    const isAvailable = availableForAssignment.includes(workerId);

    return {
      hasOtherAssignments: otherAssignments.length > 0,
      isAvailable,
      otherAssignments,
    };
  };

  const toggleWorkerSelection = (worker: Worker) => {
    const assignmentStatus = getWorkerAssignmentStatus(worker.id);

    if (assignmentStatus.hasOtherAssignments) {
      // Show warning but allow selection
      const confirmAdd = window.confirm(
        `This worker is already assigned to other pitaks on ${formData.assignmentDate}. Do you want to assign them anyway?`,
      );
      if (!confirmAdd) return;
    }

    const isSelected = formData.workers.some((w) => w.id === worker.id);
    let updatedWorkers;

    if (isSelected) {
      updatedWorkers = formData.workers.filter((w) => w.id !== worker.id);
    } else {
      updatedWorkers = [...formData.workers, worker];
    }

    handleChange("workers", updatedWorkers);
  };

  const removeWorker = (workerId: number) => {
    const updatedWorkers = formData.workers.filter((w) => w.id !== workerId);
    handleChange("workers", updatedWorkers);
  };

  const clearAllWorkers = () => {
    handleChange("workers", []);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return { bg: "#d1fae5", text: "#065f46", border: "#10b981" };
      case "on-leave":
        return { bg: "#fef3c7", text: "#92400e", border: "#f59e0b" };
      case "inactive":
        return { bg: "#f3f4f6", text: "#6b7280", border: "#9ca3af" };
      case "terminated":
        return { bg: "#fee2e2", text: "#991b1b", border: "#ef4444" };
      default:
        return { bg: "#f3f4f6", text: "#6b7280", border: "#9ca3af" };
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.workers.length === 0) {
      newErrors.workers = "At least one worker is required";
    }

    if (!formData.pitakId) {
      newErrors.pitakId = "Plot selection is required";
    }

    if (!formData.assignmentDate) {
      newErrors.assignmentDate = "Assignment date is required";
    } else {
      const selectedDate = new Date(formData.assignmentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        newErrors.assignmentDate = "Assignment date cannot be in the past";
      }
    }

    if (formData.notes.length > 1000) {
      newErrors.notes = "Notes must be less than 1000 characters";
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

    try {
      setSubmitting(true);

      // Create assignments for all selected workers
      const response = await assignmentAPI.createAssignmentWithValidation({
        workerIds: formData.workers.map((w) => w.id),
        pitakId: formData.pitakId!,
        assignmentDate: formData.assignmentDate,
        notes: formData.notes.trim() || undefined,
      });

      if (response.status && response.data?.assignments) {
        showSuccess(
          `Successfully assigned ${formData.workers.length} worker(s)!`,
        );
        if (onSuccess) {
          onSuccess(response.data.assignments);
        }
        onClose();
      } else {
        throw new Error(response.message || "Failed to create assignments");
      }
    } catch (error: any) {
      console.error("Error submitting form:", error);
      showError(error.message || "Failed to save assignments");
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled =
    formData.workers.length === 0 ||
    !formData.assignmentDate ||
    !formData.pitakId;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl shadow-lg border border-gray-200 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Create New Assignment
              </h3>
              <div className="text-xs text-gray-600 flex items-center gap-2">
                <span>Assign multiple workers to a plot</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 transition-colors"
            title="Close"
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-130px)] p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Assignment Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <UserX className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Assigned Elsewhere
                  </span>
                </div>
                <div className="text-2xl font-bold text-yellow-700">
                  {Array.from(assignedToOtherPitaks.keys()).length}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Already assigned to other plots on{" "}
                  {formData.assignmentDate || "selected date"}
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Available
                  </span>
                </div>
                <div className="text-2xl font-bold text-green-700">
                  {availableForAssignment.length}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Available for assignment on{" "}
                  {formData.assignmentDate || "selected date"}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Selected
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  {formData.workers.length}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Workers selected for this assignment
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Plot Selection */}
              <div className="space-y-6">
                {/* Plot Assignment */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <LandPlot className="w-4 h-4 text-gray-500" />
                    <h4 className="text-sm font-semibold text-gray-900">
                      Plot Assignment
                    </h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label
                        className="block text-xs font-medium mb-1.5 text-gray-700"
                        htmlFor="pitakId"
                      >
                        Select Plot <span className="text-red-500">*</span>
                      </label>
                      <PitakSelect
                        value={formData.pitakId}
                        onChange={(pitakId) => handleChange("pitakId", pitakId)}
                        placeholder="Search or select a plot..."
                        disabled={submitting}
                      />
                      {errors.pitakId && (
                        <p className="mt-1 text-xs flex items-center gap-1 text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          {errors.pitakId}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Choose the plot where workers will be assigned
                      </p>
                    </div>

                    {/* Assignment Date */}
                    <div>
                      <label
                        className="block text-xs font-medium mb-1.5 text-gray-700"
                        htmlFor="assignmentDate"
                      >
                        Assignment Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="assignmentDate"
                        type="date"
                        value={formData.assignmentDate}
                        onChange={(e) =>
                          handleChange("assignmentDate", e.target.value)
                        }
                        className={`w-full px-3 py-2 rounded text-sm border ${
                          errors.assignmentDate
                            ? "border-red-500"
                            : "border-gray-300"
                        } focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none`}
                        required
                        min={new Date().toISOString().split("T")[0]}
                      />
                      {errors.assignmentDate && (
                        <p className="mt-1 text-xs flex items-center gap-1 text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          {errors.assignmentDate}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Selected Workers Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-gray-500" />
                    <h4 className="text-sm font-semibold text-gray-900">
                      Selected Workers
                    </h4>
                    <span className="text-xs font-medium text-gray-500">
                      ({formData.workers.length} selected)
                    </span>
                  </div>

                  {formData.workers.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-medium text-gray-700">
                          Selected Workers for This Assignment{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={clearAllWorkers}
                          className="text-xs text-red-500 hover:text-red-700 transition-colors"
                        >
                          Clear All
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded bg-gray-50">
                        {formData.workers.map((worker) => {
                          const assignmentStatus = getWorkerAssignmentStatus(
                            worker.id,
                          );
                          const statusColor = getStatusColor(worker.status);

                          return (
                            <div
                              key={worker.id}
                              className={`flex items-start justify-between p-2 rounded border ${
                                assignmentStatus.hasOtherAssignments
                                  ? "border-yellow-300 bg-yellow-50"
                                  : "border-green-300 bg-green-50"
                              }`}
                            >
                              <div className="flex items-start gap-2 truncate">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    assignmentStatus.hasOtherAssignments
                                      ? "bg-yellow-100"
                                      : "bg-green-100"
                                  }`}
                                >
                                  <User
                                    className={`w-3 h-3 ${
                                      assignmentStatus.hasOtherAssignments
                                        ? "text-yellow-600"
                                        : "text-green-600"
                                    }`}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-900 truncate">
                                      {worker.name}
                                    </span>
                                    {assignmentStatus.hasOtherAssignments && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">
                                        <AlertCircle className="w-2.5 h-2.5" />
                                        Other Assignments
                                      </span>
                                    )}
                                    {!assignmentStatus.hasOtherAssignments && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                                        <CheckCircle className="w-2.5 h-2.5" />
                                        Available
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate mt-0.5">
                                    {worker.contact ||
                                      worker.email ||
                                      "No contact"}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeWorker(worker.id)}
                                className="w-5 h-5 rounded-full hover:bg-red-100 flex items-center justify-center transition-colors flex-shrink-0 ml-2 mt-0.5"
                              >
                                <X className="w-2.5 h-2.5 text-red-500" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      {errors.workers && (
                        <p className="mt-1 text-xs flex items-center gap-1 text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          {errors.workers}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded border border-dashed border-gray-300 text-center bg-gray-50">
                      <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        No workers selected
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Select workers from the list below to assign them to
                        this plot
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Worker Selection */}
              <div className="space-y-6">
                {/* Worker Selection */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-gray-500" />
                    <h4 className="text-sm font-semibold text-gray-900">
                      Worker Selection
                    </h4>
                    <span className="text-xs font-medium text-gray-500">
                      ({availableWorkers.length} available)
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {checkingAssignments && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                            Checking assignments...
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowWorkerList(!showWorkerList)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        {showWorkerList ? "Hide List" : "Show List"}
                        <ChevronDown
                          className={`w-3 h-3 transition-transform ${showWorkerList ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>

                    {showWorkerList && (
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search workers by name, contact, or email..."
                            className="w-full px-3 py-2 rounded text-sm border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                          <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        </div>

                        <div className="max-h-64 overflow-y-auto rounded border border-gray-300 divide-y divide-gray-200 bg-white">
                          {workerLoading ? (
                            <div className="p-4 text-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                              <p className="text-xs text-gray-600 mt-2">
                                Loading workers...
                              </p>
                            </div>
                          ) : workerError ? (
                            <div className="p-3 text-center bg-red-50">
                              <p className="text-xs text-red-600">
                                {workerError}
                              </p>
                            </div>
                          ) : filteredWorkers.length === 0 ? (
                            <div className="p-4 text-center">
                              <p className="text-xs text-gray-600">
                                No workers found
                              </p>
                            </div>
                          ) : (
                            filteredWorkers.map((worker) => {
                              const isSelected = formData.workers.some(
                                (w) => w.id === worker.id,
                              );
                              const assignmentStatus =
                                getWorkerAssignmentStatus(worker.id);
                              const statusColor = getStatusColor(worker.status);

                              return (
                                <div
                                  key={worker.id}
                                  className={`p-2 flex items-center justify-between hover:bg-gray-50 cursor-pointer ${
                                    isSelected ? "bg-blue-50" : ""
                                  } ${assignmentStatus.hasOtherAssignments ? "bg-yellow-50" : ""}`}
                                  onClick={() => toggleWorkerSelection(worker)}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div
                                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                        isSelected
                                          ? "bg-blue-500 border-blue-500"
                                          : assignmentStatus.hasOtherAssignments
                                            ? "border-yellow-500 bg-yellow-100"
                                            : "border-gray-300"
                                      }`}
                                    >
                                      {isSelected && (
                                        <Check className="w-2.5 h-2.5 text-white" />
                                      )}
                                      {assignmentStatus.hasOtherAssignments &&
                                        !isSelected && (
                                          <AlertCircle className="w-2.5 h-2.5 text-yellow-600" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium text-gray-900 truncate">
                                          {worker.name}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span
                                            className="text-xs px-1.5 py-0.5 rounded-full truncate"
                                            style={{
                                              backgroundColor: statusColor.bg,
                                              color: statusColor.text,
                                              border: `1px solid ${statusColor.border}`,
                                            }}
                                          >
                                            {worker.status}
                                          </span>
                                          {assignmentStatus.hasOtherAssignments && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">
                                              <AlertCircle className="w-2.5 h-2.5" />
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-gray-500 truncate">
                                          {worker.contact ||
                                            worker.email ||
                                            "No contact"}
                                        </span>
                                      </div>

                                      {assignmentStatus.hasOtherAssignments && (
                                        <div className="mt-1">
                                          <div className="text-xs text-yellow-700">
                                            <AlertCircle className="w-2.5 h-2.5 inline mr-1" />
                                            Assigned to{" "}
                                            {
                                              assignmentStatus.otherAssignments
                                                .length
                                            }{" "}
                                            other plot
                                            {assignmentStatus.otherAssignments
                                              .length !== 1
                                              ? "s"
                                              : ""}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {!isSelected && (
                                    <Plus className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <h4 className="text-sm font-semibold text-gray-900">
                      Additional Information
                    </h4>
                  </div>
                  <div>
                    <textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleChange("notes", e.target.value)}
                      className={`w-full px-3 py-2 rounded text-sm border ${
                        errors.notes ? "border-red-500" : "border-gray-300"
                      } focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none`}
                      placeholder="Enter any additional notes about this assignment... 
                        • Specific tasks to be performed
                        • Tools or equipment needed
                        • Special instructions or precautions
                        • Expected work duration
                        • Quality requirements
                        • Communication protocols"
                      rows={4}
                    />
                    {errors.notes && (
                      <p className="mt-1 text-xs flex items-center gap-1 text-red-600">
                        <AlertCircle className="w-3 h-3" />
                        {errors.notes}
                      </p>
                    )}
                    <div className="mt-2 flex justify-between items-center">
                      <p className="text-xs text-gray-500">
                        Add detailed instructions and information for the
                        workers
                      </p>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          formData.notes.length > 1000
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {formData.notes.length}/1000
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Info */}
            {formData.workers.length > 0 && (
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <h5 className="text-xs font-medium text-gray-900 mb-2">
                  Assignment Summary
                </h5>
                <div className="space-y-1">
                  {formData.workers.some(
                    (w) => getWorkerAssignmentStatus(w.id).hasOtherAssignments,
                  ) && (
                    <div className="flex items-center gap-2 text-xs text-yellow-700">
                      <AlertCircle className="w-3 h-3" />
                      <span>
                        {
                          formData.workers.filter(
                            (w) =>
                              getWorkerAssignmentStatus(w.id)
                                .hasOtherAssignments,
                          ).length
                        }
                        worker(s) have other assignments on{" "}
                        {formData.assignmentDate}
                      </span>
                    </div>
                  )}
                  {formData.workers.some((w) => {
                    const status = getWorkerAssignmentStatus(w.id);
                    return !status.hasOtherAssignments;
                  }) && (
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <CheckCircle className="w-3 h-3" />
                      <span>
                        {
                          formData.workers.filter((w) => {
                            const status = getWorkerAssignmentStatus(w.id);
                            return !status.hasOtherAssignments;
                          }).length
                        }
                        worker(s) are available for assignment
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
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
                onClick={onClose}
                className="px-3 py-1.5 rounded text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitDisabled || submitting}
                className="px-3 py-1.5 rounded text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                    Creating Assignments...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Assign {formData.workers.length} Worker
                    {formData.workers.length !== 1 ? "s" : ""}
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

export default AssignmentFormDialog;
