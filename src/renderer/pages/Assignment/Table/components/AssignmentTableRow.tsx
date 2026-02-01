// components/Assignment/components/AssignmentTableRow.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  Calendar,
  Users,
  MapPin,
  Hash,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  ChevronRight,
  Clock,
  FileText,
  MoreVertical,
  UserPlus,
  History,
  BarChart3,
  Download,
} from "lucide-react";
import { formatDate, formatNumber } from "../../../../utils/formatters";
import type { Assignment } from "../../../../apis/assignment";
import AssignmentActionsDropdown from "./AssignmentActionsDropdown";

interface AssignmentTableRowProps {
  assignment: Assignment;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onUpdateStatus: (id: number, currentStatus: string) => void;
  onCancel: (id: number) => void;
  onAddNote: (id: number, name:string) => void;
  onReassignWorker: (id: number) => void;
  onUpdateLuWang: (id: number) => void;
}

const AssignmentTableRow: React.FC<AssignmentTableRowProps> = ({
  assignment,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onView,
  onEdit,
  onDelete,
  onUpdateStatus,
  onCancel,
  onAddNote,
  onReassignWorker,
  onUpdateLuWang,
}) => {
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const getStatusBadge = (status: string = "active") => {
    const statusConfig = {
      active: {
        text: "Active",
        bg: "var(--status-planted-bg)",
        color: "var(--status-planted)",
        border: "rgba(56, 161, 105, 0.3)",
        icon: XCircle,
      },
      completed: {
        text: "Completed",
        bg: "var(--accent-sky-light)",
        color: "var(--accent-sky)",
        border: "rgba(49, 130, 206, 0.3)",
        icon: CheckCircle,
      },
      cancelled: {
        text: "Cancelled",
        bg: "var(--accent-rust-light)",
        color: "var(--accent-rust)",
        border: "rgba(197, 48, 48, 0.3)",
        icon: XCircle,
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    const Icon = config.icon;

    return (
      <span
        className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
        style={{
          background: config.bg,
          color: config.color,
          border: `1px solid ${config.border}`,
        }}
      >
        <Icon className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowActionsDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleActionClick = (action: () => void) => {
    action();
    setShowActionsDropdown(false);
  };

  // Get dropdown position
  const getDropdownPosition = () => {
    if (!buttonRef.current) return {};

    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 280; // Estimated height of dropdown
    const windowHeight = window.innerHeight;

    // Check if dropdown would overflow bottom of window
    if (rect.bottom + dropdownHeight > windowHeight) {
      // Show above the button
      return {
        bottom: `${windowHeight - rect.top + 5}px`,
        right: `${window.innerWidth - rect.right}px`,
      };
    }

    // Show below the button
    return {
      top: `${rect.bottom + 5}px`,
      right: `${window.innerWidth - rect.right}px`,
    };
  };

  const ExpandedView = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-3 rounded-lg" style={{ background: "var(--card-bg)" }}>
        <div className="flex items-center gap-2 mb-2">
          <FileText
            className="w-4 h-4"
            style={{ color: "var(--accent-green)" }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Assignment Details
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Created:
            </span>
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {formatDate(assignment.createdAt, "MMM dd, yyyy HH:mm")}
            </span>
          </div>
          <div className="flex justify-between">
            <span
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Updated:
            </span>
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {formatDate(assignment.updatedAt, "MMM dd, yyyy HH:mm")}
            </span>
          </div>
          {assignment.notes && (
            <div
              className="mt-2 pt-2 border-t"
              style={{ borderColor: "var(--border-color)" }}
            >
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Notes:
              </span>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--text-primary)" }}
              >
                {assignment.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 rounded-lg" style={{ background: "var(--card-bg)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4" style={{ color: "var(--accent-sky)" }} />
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Worker Information
          </span>
        </div>
        {assignment.worker && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Name:
              </span>
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {assignment.worker.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Code:
              </span>
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {assignment.worker.code}
              </span>
            </div>
            {assignment.worker.contactNumber && (
              <div className="flex justify-between">
                <span
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Contact:
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {assignment.worker.contactNumber}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 rounded-lg" style={{ background: "var(--card-bg)" }}>
        <div className="flex items-center gap-2 mb-2">
          <MapPin
            className="w-4 h-4"
            style={{ color: "var(--accent-earth)" }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Pitak Information
          </span>
        </div>
        {assignment.pitak && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Name:
              </span>
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {assignment.pitak.name || `Pitak #${assignment.pitak.id}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Code:
              </span>
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {assignment.pitak.code}
              </span>
            </div>
            {assignment.pitak.location && (
              <div className="flex justify-between">
                <span
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Location:
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {assignment.pitak.location}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <tr
        className="hover:bg-gray-50 transition-colors"
        style={{ borderBottom: "1px solid var(--border-color)" }}
      >
        <td className="p-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="rounded"
            style={{ borderColor: "var(--border-color)" }}
          />
        </td>
        <td className="p-4">
          <div className="flex items-center gap-2">
            <Calendar
              className="w-4 h-4"
              style={{ color: "var(--text-tertiary)" }}
            />
            <div>
              <div
                className="font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {formatDate(assignment.assignmentDate, "MMM dd, yyyy")}
              </div>
              <div
                className="text-xs"
                style={{ color: "var(--text-tertiary)" }}
              >
                ID: {assignment.id}
              </div>
            </div>
          </div>
        </td>
        <td className="p-4">
          {assignment.worker ? (
            <div className="flex items-center gap-2">
              <Users
                className="w-4 h-4"
                style={{ color: "var(--accent-sky)" }}
              />
              <div>
                <div
                  className="font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {assignment.worker.name}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {assignment.worker.code}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-500">No worker</span>
          )}
        </td>
        <td className="p-4">
          {assignment.pitak ? (
            <div className="flex items-center gap-2">
              <MapPin
                className="w-4 h-4"
                style={{ color: "var(--accent-earth)" }}
              />
              <div>
                <div
                  className="font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {assignment.pitak.name || `Pitak #${assignment.pitak.id}`}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {assignment.pitak.code}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-500">No pitak</span>
          )}
        </td>
        <td className="p-4">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4" style={{ color: "var(--accent-gold)" }} />
            <span
              className="font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {assignment.luwangCount}
            </span>
          </div>
        </td>
        <td className="p-4">{getStatusBadge(assignment.status)}</td>
        <td className="p-4">
          <div className="flex items-center gap-2">
            {/* Quick action buttons */}
            <button
              onClick={() => onView(assignment.id)}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4" style={{ color: "var(--accent-sky)" }} />
            </button>
            <button
              onClick={() => onEdit(assignment.id)}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="Edit"
            >
              <Edit
                className="w-4 h-4"
                style={{ color: "var(--accent-gold)" }}
              />
            </button>

            {/* Actions Dropdown */}
            <AssignmentActionsDropdown
              assignment={assignment}
              onView={onView}
              onEdit={onEdit}
              onCancel={onCancel}
              onDelete={onDelete}
              onAddNote={onAddNote}
              onReassignWorker={onReassignWorker}
              onUpdateLuWang={onUpdateLuWang}
              onUpdateStatus={onUpdateStatus}
            />

            <button
              onClick={onToggleExpand}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="More Details"
            >
              <ChevronRight
                className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
              />
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded Row */}
      {isExpanded && (
        <tr>
          <td
            colSpan={7}
            className="p-4"
            style={{ background: "var(--card-secondary-bg)" }}
          >
            <ExpandedView />
          </td>
        </tr>
      )}
    </>
  );
};

export default AssignmentTableRow;
