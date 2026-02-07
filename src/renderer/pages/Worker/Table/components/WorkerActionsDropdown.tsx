// components/Worker/components/WorkerActionsDropdown.tsx
import React, { useRef, useEffect, useState } from "react";
import {
  Eye,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  Printer,
  DollarSign,
  FileText,
  History,
  MoreVertical,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Download,
  Clock,
  XCircle,
  CheckCircle,
  Users,
  FileDigit,
  Building,
  ArrowUpDown,
  Activity,
  Shield,
  Globe,
} from "lucide-react";

interface WorkerActionsDropdownProps {
  worker: any;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateStatus: (newStatus: string) => void;
  onGenerateReport: () => void;
}

const WorkerActionsDropdown: React.FC<WorkerActionsDropdownProps> = ({
  worker,
  onView,
  onEdit,
  onDelete,
  onUpdateStatus,
  onGenerateReport,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

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
    const dropdownHeight = 350;
    const windowHeight = window.innerHeight;

    if (rect.bottom + dropdownHeight > windowHeight) {
      return {
        bottom: `${windowHeight - rect.top + 5}px`,
        right: `${window.innerWidth - rect.right}px`,
      };
    }

    return {
      top: `${rect.bottom + 5}px`,
      right: `${window.innerWidth - rect.right}px`,
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return CheckCircle;
      case "inactive":
        return UserMinus;
      case "on-leave":
        return Clock;
      case "terminated":
        return XCircle;
      default:
        return CheckCircle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600";
      case "inactive":
        return "text-gray-600";
      case "on-leave":
        return "text-yellow-600";
      case "terminated":
        return "text-red-600";
      default:
        return "text-green-600";
    }
  };

  const StatusIcon = getStatusIcon(worker.status);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        className="p-1.5 rounded hover:bg-gray-100 transition-colors relative cursor-pointer"
        title="More Actions"
      >
        <MoreVertical
          className="w-4 h-4"
          style={{ color: "var(--text-secondary)" }}
        />
      </button>

      {isOpen && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 w-64 z-50 max-h-80 overflow-y-auto"
          style={getDropdownPosition()}
        >
          <div className="py-2">
            {/* Header with worker info */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">
                    {worker.name}
                  </h4>
                  <p className="text-xs text-gray-500 truncate">
                    ID: {worker.id}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon
                    className={`w-4 h-4 ${getStatusColor(worker.status)}`}
                  />
                  <span className="text-sm font-medium capitalize text-gray-700">
                    {worker.status}
                  </span>
                </div>
                {worker.kabisilya && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Building className="w-3 h-3" />
                    <span>{worker.kabisilya.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Info Section */}
            <div className="px-4 py-2 border-b border-gray-100">
              <div className="space-y-2">
                {worker.contact && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-700 truncate">
                      {worker.contact}
                    </span>
                  </div>
                )}
                {worker.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-yellow-500" />
                    <span className="text-gray-700 truncate">
                      {worker.email}
                    </span>
                  </div>
                )}
                {worker.hireDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <span className="text-gray-700">
                      Hired: {new Date(worker.hireDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Section */}
            <div className="px-4 py-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Quick Actions
              </div>
              <div className="space-y-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(onView);
                  }}
                  className="flex items-center gap-3 w-full px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <Eye
                    className="w-4 h-4"
                    style={{ color: "var(--accent-sky)" }}
                  />
                  <span>View Details</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(onEdit);
                  }}
                  className="flex items-center gap-3 w-full px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <Edit
                    className="w-4 h-4"
                    style={{ color: "var(--accent-gold)" }}
                  />
                  <span>Edit Worker</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(() => {
                      // Record Payment action
                    });
                  }}
                  className="flex items-center gap-3 w-full px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer hidden"
                >
                  <CreditCard
                    className="w-4 h-4"
                    style={{ color: "var(--accent-green)" }}
                  />
                  <span>Record Payment</span>
                </button>
              </div>
            </div>

            {/* Status Management Section */}
            <div className="px-4 py-2 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Status Management
              </div>
              <div className="grid grid-cols-2 gap-1">
                {worker.status !== "active" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(() => onUpdateStatus("active"));
                    }}
                    className="flex items-center gap-2 px-2 py-2 text-xs text-gray-700 hover:bg-green-50 hover:text-green-700 rounded cursor-pointer"
                  >
                    <CheckCircle className="w-3 h-3" />
                    <span>Activate</span>
                  </button>
                )}
                {worker.status !== "inactive" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(() => onUpdateStatus("inactive"));
                    }}
                    className="flex items-center gap-2 px-2 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <UserMinus className="w-3 h-3" />
                    <span>Deactivate</span>
                  </button>
                )}
                {worker.status !== "on-leave" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(() => onUpdateStatus("on-leave"));
                    }}
                    className="flex items-center gap-2 px-2 py-2 text-xs text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 rounded cursor-pointer"
                  >
                    <Clock className="w-3 h-3" />
                    <span>On Leave</span>
                  </button>
                )}
                {worker.status !== "terminated" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(() => onUpdateStatus("terminated"));
                    }}
                    className="flex items-center gap-2 px-2 py-2 text-xs text-gray-700 hover:bg-red-50 hover:text-red-700 rounded cursor-pointer"
                  >
                    <XCircle className="w-3 h-3" />
                    <span>Terminate</span>
                  </button>
                )}
              </div>
            </div>

            {/* Reports Section */}
            <div className="px-4 py-2 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Reports & Documents
              </div>
              <div className="space-y-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(onGenerateReport);
                  }}
                  className="flex items-center gap-3 w-full px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer hidden"
                >
                  <Printer
                    className="w-4 h-4"
                    style={{ color: "var(--accent-purple)" }}
                  />
                  <span>Generate Report</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(() => {
                      // Financial statement
                    });
                  }}
                  className="flex items-center gap-3 w-full px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <FileText
                    className="w-4 h-4"
                    style={{ color: "var(--accent-green)" }}
                  />
                  <span>Financial Statement</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(() => {
                      // Export to PDF
                    });
                  }}
                  className="flex items-center gap-3 w-full px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer hidden"
                >
                  <Download
                    className="w-4 h-4"
                    style={{ color: "var(--accent-sky)" }}
                  />
                  <span>Export to PDF</span>
                </button>
              </div>
            </div>

            {/* Advanced Features Section */}
            <div className="px-4 py-2 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Advanced Features
              </div>
              <div className="space-y-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(() => {
                      // View transactions
                    });
                  }}
                  className="flex items-center gap-3 w-full px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer hidden"
                >
                  <FileDigit className="w-4 h-4" />
                  <span>View Transactions</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(() => {
                      // View activity
                    });
                  }}
                  className="flex items-center gap-3 w-full px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer hidden"
                >
                  <Activity className="w-4 h-4" />
                  <span>Activity Log</span>
                </button>
              </div>
            </div>

            {/* Danger Zone Section */}
            <div className="px-4 py-2 border-t border-gray-100 bg-red-50">
              <div className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                Danger Zone
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(onDelete);
                }}
                className="flex items-center gap-3 w-full px-2 py-2 text-sm text-red-600 hover:bg-red-100 rounded"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Worker</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerActionsDropdown;
