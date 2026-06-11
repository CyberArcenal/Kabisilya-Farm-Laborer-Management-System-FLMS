// src/renderer/pages/assignments/hooks/useAssignmentForm.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import type { Assignment } from "../../../../../api/core/assignment";
import systemConfigAPI from "../../../../../api/utils/system_config";
import workerAPI from "../../../../../api/core/worker";
import assignmentAPI from "../../../../../api/core/assignment";
import { showError } from "../../../../../utils/notification";
import type { Worker } from "../../../../../api/core/worker";
import {
  useDefaultSessionId,
  useFarmAssignmentSettings,
} from "../../../../../utils/config/farmConfig";
export interface AssignmentFormData {
  pitakId: number | null;
  assignmentDate: string;
  notes: string;
  workers: Worker[];
}

export interface UseAssignmentFormProps {
  workerIds?: number[];
  pitakId?: number | null;
  isReassignment?: boolean;
  reassignmentAssignmentId?: number;
  onClose: () => void;
  onSuccess?: (assignments: Assignment[]) => void;
}

export const useAssignmentForm = ({
  workerIds = [],
  pitakId = null,
  isReassignment = false,
  reassignmentAssignmentId,
  onClose,
  onSuccess,
}: UseAssignmentFormProps) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<AssignmentFormData>({
    pitakId: pitakId? pitakId : null,
    assignmentDate: new Date().toISOString().split("T")[0],
    notes: "",
    workers: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Session state (default session ID)
  const sessionId = useDefaultSessionId();

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

  useEffect(() => {
    setFormData((prev) => ({ ...prev, pitakId }));
  }, [pitakId]);

  // Fetch initial workers based on workerIds prop
  useEffect(() => {
    const fetchInitialWorkers = async () => {
      if (workerIds.length === 0) return;

      setWorkerLoading(true);
      try {
        const workerPromises = workerIds.map((id) =>
          workerAPI.getById(id).catch(() => null),
        );

        const workerResponses = await Promise.all(workerPromises);
        const validWorkers = workerResponses
          .filter(
            (
              response,
            ): response is { status: boolean; message: ""; data: Worker } =>
              response !== null && response.status && !!response.data,
          )
          .map((response) => response.data);

        setFormData((prev) => ({
          ...prev,
          workers: validWorkers,
        }));

        // For reassignment, fetch original assignment details
        if (isReassignment && reassignmentAssignmentId) {
          try {
            const assignmentResponse = await assignmentAPI.getById(
              reassignmentAssignmentId,
            );
            if (assignmentResponse.status && assignmentResponse.data) {
              const assignment = assignmentResponse.data;
              setFormData((prev) => ({
                ...prev,
                pitakId: assignment.pitak?.id || null,
                assignmentDate: assignment.assignmentDate,
                notes: assignment.notes || prev.notes,
              }));
            }
          } catch (err) {
            console.error("Error fetching assignment details:", err);
          }
        }
      } catch (err: any) {
        console.error("Error fetching initial workers:", err);
        showError("Failed to load initial worker data");
      } finally {
        setWorkerLoading(false);
      }
    };

    fetchInitialWorkers();
  }, [workerIds, isReassignment, reassignmentAssignmentId]);

  // Fetch available workers for selection
  useEffect(() => {
    const fetchWorkers = async () => {
      setWorkerLoading(true);
      setWorkerError(null);
      try {
        const response = await workerAPI.getAll({
          status: "active",
          limit: 100,
          sortBy: "name",
          sortOrder: "ASC",
        });

        if (response.status) {
          const activeWorkers = response.data.filter(
            (worker) =>
              worker.status === "active" || worker.status === "on-leave",
          );
          setAvailableWorkers(activeWorkers);

          // Sync preselected workers with available list
          if (formData.workers.length > 0) {
            const updatedWorkers = formData.workers.map((selectedWorker) => {
              const updated = activeWorkers.find(
                (w) => w.id === selectedWorker.id,
              );
              return updated || selectedWorker;
            });
            setFormData((prev) => ({ ...prev, workers: updatedWorkers }));
          }
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

    if (showWorkerList || formData.workers.length === 0) {
      fetchWorkers();
    }
  }, [showWorkerList, formData.workers.length]);

  // Check worker assignments when pitak or date changes
  useEffect(() => {
    const checkWorkerAssignments = async () => {
      if (!formData.pitakId || !formData.assignmentDate) return;

      setCheckingAssignments(true);
      const otherPitakAssignments = new Map<number, any[]>();
      const availableWorkersList: number[] = [];

      try {
        const response = await assignmentAPI.getAll({
          startDate: formData.assignmentDate,
          endDate: formData.assignmentDate,
          status: "active",
        });

        if (response.status && response.data) {
          const dateAssignments = response.data;
          const assignedWorkerIds = new Set<number>();

          dateAssignments.forEach((assignment: Assignment) => {
            if (assignment.worker && assignment.worker.id) {
              assignedWorkerIds.add(assignment.worker.id);

              if (assignment.pitak?.id === formData.pitakId) return;

              if (!otherPitakAssignments.has(assignment.worker.id)) {
                otherPitakAssignments.set(assignment.worker.id, []);
              }

              otherPitakAssignments.get(assignment.worker.id)?.push({
                assignmentId: assignment.id,
                pitakId: assignment.pitak?.id,
                pitakName: assignment.pitak?.location || "Unknown Pitak",
                pitakCode: "N/A",
                status: assignment.status,
                luwangCount: assignment.luwangCount,
                notes: assignment.notes,
              });
            }
          });

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

  // Handlers
  const handleChange = useCallback(
    (field: keyof AssignmentFormData, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    },
    [errors],
  );

  const getWorkerAssignmentStatus = useCallback(
    (workerId: number) => {
      const otherAssignments = assignedToOtherPitaks.get(workerId) || [];
      const isAvailable = availableForAssignment.includes(workerId);
      return {
        hasOtherAssignments: otherAssignments.length > 0,
        isAvailable,
        otherAssignments,
      };
    },
    [assignedToOtherPitaks, availableForAssignment],
  );

  const toggleWorkerSelection = useCallback(
    (worker: Worker) => {
      const assignmentStatus = getWorkerAssignmentStatus(worker.id);

      if (assignmentStatus.hasOtherAssignments) {
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
    },
    [
      formData.workers,
      formData.assignmentDate,
      getWorkerAssignmentStatus,
      handleChange,
    ],
  );

  const removeWorker = useCallback(
    (workerId: number) => {
      const updatedWorkers = formData.workers.filter((w) => w.id !== workerId);
      handleChange("workers", updatedWorkers);
    },
    [formData.workers, handleChange],
  );

  const clearAllWorkers = useCallback(() => {
    handleChange("workers", []);
  }, [handleChange]);

  const filteredWorkers = useMemo(() => {
    return availableWorkers.filter((worker) => {
      const matchesSearch =
        worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.email?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [availableWorkers, searchTerm]);

  // Validation
  const validateForm = useCallback((): boolean => {
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

    if (!sessionId) {
      newErrors.session =
        "No active session found. Please set a default session.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, sessionId]);

  const isSubmitDisabled = useMemo(() => {
    return (
      formData.workers.length === 0 ||
      !formData.assignmentDate ||
      !formData.pitakId ||
      !sessionId
    );
  }, [
    formData.workers.length,
    formData.assignmentDate,
    formData.pitakId,
    sessionId,
  ]);

  // Submit handler

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        showError("Please fix the errors in the form");
        return;
      }

      try {
        setSubmitting(true);

        // Cancel old assignment if this is a reassignment
        if (isReassignment && reassignmentAssignmentId) {
          await assignmentAPI.update(reassignmentAssignmentId, {
            status: "cancelled",
            notes: "Reassigned to new plot",
          });
        }

        // Create new assignments using bulk method
        const workerIds = formData.workers.map((w) => w.id);
        const response = await assignmentAPI.createBulk({
          workerIds,
          pitakId: formData.pitakId!,
          sessionId: sessionId!,
          assignmentDate: formData.assignmentDate,
          notes: formData.notes.trim() || undefined,
        });

        if (response.status && response.data) {
          if (onSuccess) {
            onSuccess(response.data); // response.data is array of assignments
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
    },
    [
      validateForm,
      isReassignment,
      reassignmentAssignmentId,
      formData,
      sessionId,
      onSuccess,
      onClose,
    ],
  );

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  return {
    // State
    loading,
    submitting,
    formData,
    errors,
    setErrors,

    // Workers
    availableWorkers,
    workerLoading,
    workerError,
    searchTerm,
    setSearchTerm,
    showWorkerList,
    setShowWorkerList,

    // Assignment checking
    assignedToOtherPitaks,
    availableForAssignment,
    checkingAssignments,

    // Session
    sessionId,

    // Handlers
    handleChange,
    toggleWorkerSelection,
    removeWorker,
    clearAllWorkers,
    handleSubmit,
    close,

    // Computed
    filteredWorkers,
    getWorkerAssignmentStatus,
    isSubmitDisabled,
  };
};
