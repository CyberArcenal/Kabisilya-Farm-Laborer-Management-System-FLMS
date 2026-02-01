// components/Assignment/components/AssignmentActionsDropdown.tsx
import React, { useRef, useEffect, useState } from "react";
import {
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Trash2,
  MoreVertical,
  UserPlus,
  FileText,
  Layers,
} from "lucide-react";
import type { Assignment } from "../../../../apis/assignment";

interface AssignmentActionsDropdownProps {
  assignment: Assignment;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onUpdateStatus: (id: number, status: string) => void;
  onCancel: (id: number) => void;
  onDelete: (id: number) => void;
  onAddNote: (id: number, name:string) => void;
  onReassignWorker: (id: number) => void;
  onUpdateLuWang: (id: number) => void;
}

const AssignmentActionsDropdown: React.FC<AssignmentActionsDropdownProps> = ({
  assignment,
  onView,
  onEdit,
  onUpdateStatus,
  onCancel,
  onDelete,
  onAddNote,
  onReassignWorker,
  onUpdateLuWang,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => setIsOpen(!isOpen);
  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getDropdownPosition = () => {
    if (!buttonRef.current) return {};
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 240;
    const windowHeight = window.innerHeight;
    if (rect.bottom + dropdownHeight > windowHeight) {
      return {
        position: "fixed" as const,
        bottom: `${windowHeight - rect.top + 5}px`,
        right: `${window.innerWidth - rect.right}px`,
        zIndex: 1000,
      };
    }
    return {
      position: "fixed" as const,
      top: `${rect.bottom + 5}px`,
      right: `${window.innerWidth - rect.right}px`,
      zIndex: 1000,
    };
  };

  return (
    <div className="assignment-actions-dropdown-container" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="p-1.5 rounded hover:bg-gray-100 transition-colors relative z-50"
        title="More Actions"
      >
        <MoreVertical
          className="w-4 h-4"
          style={{ color: "var(--text-secondary)" }}
        />
      </button>

      {isOpen && (
        <div
          className="bg-white rounded-lg shadow-lg border border-gray-200 min-w-[200px] py-1"
          style={getDropdownPosition()}
        >
          <div className="py-1">
            <button
              onClick={() => handleAction(() => onView(assignment.id))}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
            >
              <Eye className="w-4 h-4 text-sky-500" /> <span>View Details</span>
            </button>
            <button
              onClick={() => handleAction(() => onEdit(assignment.id))}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
            >
              <Edit className="w-4 h-4 text-yellow-500" /> <span>Edit</span>
            </button>
            <button
              onClick={() => handleAction(() => onAddNote(assignment.id, assignment.name))}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
            >
              <FileText className="w-4 h-4 text-blue-500" />{" "}
              <span>Add Note</span>
            </button>
            <button
              onClick={() =>
                handleAction(() => onReassignWorker(assignment.id))
              }
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
            >
              <UserPlus className="w-4 h-4 text-purple-500" />{" "}
              <span>Reassign Worker</span>
            </button>
            <button
              onClick={() => handleAction(() => onUpdateLuWang(assignment.id))}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
            >
              <Layers className="w-4 h-4 text-green-600" />{" "}
              <span>Update LuWang Count</span>
            </button>

            {assignment.status === "active" && (
              <>
                <button
                  onClick={() =>
                    handleAction(() =>
                      onUpdateStatus(assignment.id, "completed"),
                    )
                  }
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                >
                  <CheckCircle className="w-4 h-4 text-green-500" />{" "}
                  <span>Mark as Completed</span>
                </button>
                <button
                  onClick={() => handleAction(() => onCancel(assignment.id))}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                >
                  <XCircle className="w-4 h-4 text-red-500" />{" "}
                  <span>Cancel Assignment</span>
                </button>
              </>
            )}

            <div className="border-t border-gray-200 my-1"></div>
            <button
              onClick={() => handleAction(() => onDelete(assignment.id))}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" /> <span>Delete</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentActionsDropdown;
