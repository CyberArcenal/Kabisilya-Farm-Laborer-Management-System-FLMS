// components/Assignment/components/AssignmentTableView.tsx
import React, { useState } from "react";
import { ChevronRight as ChevronRightIcon } from "lucide-react";
import type { Assignment } from "../../../../apis/assignment";
import AssignmentTableRow from "./AssignmentTableRow";

interface AssignmentTableViewProps {
  assignments: Assignment[];
  selectedAssignments: number[];
  toggleSelectAll: () => void;
  toggleSelectAssignment: (id: number) => void;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onUpdateStatus: (id: number, currentStatus: string) => void;
  onCancel: (id: number) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;

  onAddNote: (id: number, name:string) => void;
  onReassignWorker: (id: number) => void;
  onUpdateLuWang: (id: number) => void;
}

const AssignmentTableView: React.FC<AssignmentTableViewProps> = ({
  assignments,
  selectedAssignments,
  toggleSelectAll,
  toggleSelectAssignment,
  onView,
  onEdit,
  onDelete,
  onUpdateStatus,
  onCancel,
  sortBy,
  sortOrder,
  onSort,
  onAddNote,
  onReassignWorker,
  onUpdateLuWang,
}) => {
  const [expandedAssignment, setExpandedAssignment] = useState<number | null>(
    null,
  );

  const toggleExpandAssignment = (id: number) => {
    setExpandedAssignment((prev) => (prev === id ? null : id));
  };

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{ borderColor: "var(--border-color)" }}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--table-header-bg)" }}>
              <th className="p-4 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedAssignments.length === assignments.length &&
                    assignments.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="rounded"
                  style={{ borderColor: "var(--border-color)" }}
                />
              </th>
              <th
                className="p-4 text-left text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                <button
                  onClick={() => onSort("assignmentDate")}
                  className="flex items-center gap-1 hover:text-primary"
                >
                  Date
                  {sortBy === "assignmentDate" && (
                    <ChevronRightIcon
                      className={`w-3 h-3 transform ${sortOrder === "asc" ? "rotate-90" : "-rotate-90"}`}
                    />
                  )}
                </button>
              </th>
              <th
                className="p-4 text-left text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Worker
              </th>
              <th
                className="p-4 text-left text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Pitak
              </th>
              <th
                className="p-4 text-left text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                <button
                  onClick={() => onSort("luwangCount")}
                  className="flex items-center gap-1 hover:text-primary"
                >
                  LuWang
                  {sortBy === "luwangCount" && (
                    <ChevronRightIcon
                      className={`w-3 h-3 transform ${sortOrder === "asc" ? "rotate-90" : "-rotate-90"}`}
                    />
                  )}
                </button>
              </th>
              <th
                className="p-4 text-left text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Status
              </th>
              <th
                className="p-4 text-left text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => (
              <AssignmentTableRow
                key={assignment.id}
                assignment={assignment}
                isSelected={selectedAssignments.includes(assignment.id)}
                isExpanded={expandedAssignment === assignment.id}
                onSelect={() => toggleSelectAssignment(assignment.id)}
                onToggleExpand={() => toggleExpandAssignment(assignment.id)}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
                onUpdateStatus={onUpdateStatus}
                onCancel={onCancel}
                onAddNote={onAddNote}
                onReassignWorker={onReassignWorker}
                onUpdateLuWang={onUpdateLuWang}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssignmentTableView;
