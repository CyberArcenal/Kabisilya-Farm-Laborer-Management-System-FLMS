// components/Bukid/components/BukidTableRow.tsx
import React, { useRef, useEffect, useState } from "react";
import {
  Home,
  MapPin,
  Package,
  ChevronRight,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Hash,
  Layers,
  AlertCircle,
  Calendar,
  Tag,
} from "lucide-react";
import { formatDate } from "../../../../utils/formatters";
import type { BukidData, BukidSummaryData } from "../../../../apis/bukid";
import BukidActionsDropdown from "./BukidActionsDropdown";

interface BukidTableRowProps {
  bukid: BukidData;
  bukidSummary: BukidSummaryData | undefined;
  isSelected: boolean;
  isExpanded: boolean;
  onComplete: (id: number) => void;
  onSelect: () => void;
  onToggleExpand: () => void;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number, name: string) => void;
  onUpdateStatus: (id: number, currentStatus: string) => void;
  onAddNote: (id: number) => void;
  onViewStats: (id: number) => void;
  onImportCSV: (id: number) => void;
  onExportCSV: (id: number) => void;
  onAddPlot: (id: number) => void; // NEW
  onViewPlots: (id: number) => void; // NEW
  onViewMap?: (id: number) => void; // NEW
  onViewNote: (id: number) => void; // NEW
}

const BukidTableRow: React.FC<BukidTableRowProps> = ({
  bukid,
  bukidSummary,
  isSelected,
  isExpanded,
  onComplete,
  onSelect,
  onToggleExpand,
  onView,
  onEdit,
  onDelete,
  onUpdateStatus,
  onAddNote,
  onViewStats,
  onImportCSV,
  onExportCSV,
  onAddPlot,
  onViewPlots,
  onViewMap,
  onViewNote,
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
        icon: CheckCircle,
        tooltip: "Bukid is active and operational",
      },
      inactive: {
        text: "Inactive",
        bg: "var(--status-fallow-bg)",
        color: "var(--status-fallow)",
        border: "rgba(113, 128, 150, 0.3)",
        icon: XCircle,
        tooltip: "Bukid is temporarily inactive",
      },
      pending: {
        text: "Pending",
        bg: "var(--status-growing-bg)",
        color: "var(--status-growing)",
        border: "rgba(214, 158, 46, 0.3)",
        icon: XCircle,
        tooltip: "Bukid is pending activation",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    const Icon = config.icon;

    return (
      <div className="tooltip-wrapper">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 status-badge ${status}`}
          style={{
            background: config.bg,
            color: config.color,
            border: `1px solid ${config.border}`,
          }}
        >
          <Icon className="w-3 h-3" />
          {config.text}
        </span>
        <span className="tooltip-text">{config.tooltip}</span>
      </div>
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          className="p-3 rounded-lg"
          style={{ background: "var(--card-bg)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Package
              className="w-4 h-4"
              style={{ color: "var(--accent-sky)" }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Assignments
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Active:
              </span>
              <span className="font-semibold text-green-600">
                {bukidSummary?.activeAssignments || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Total:
              </span>
              <span
                className="font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {bukidSummary?.assignmentCount || 0}
              </span>
            </div>
          </div>
        </div>

        <div
          className="p-3 rounded-lg"
          style={{ background: "var(--card-bg)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <MapPin
              className="w-4 h-4"
              style={{ color: "var(--accent-earth)" }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Pitaks & Luwang
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Pitaks:
              </span>
              <span
                className="font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {bukidSummary?.pitakCount || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Total Luwang:
              </span>
              <span
                className="font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {bukidSummary?.totalLuwang || 0}
              </span>
            </div>
          </div>
        </div>

        <div
          className="p-3 rounded-lg"
          style={{ background: "var(--card-bg)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock
              className="w-4 h-4"
              style={{ color: "var(--accent-purple)" }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Timeline
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              <Calendar className="w-3 h-3 inline mr-1" />
              Created: {formatDate(bukid.createdAt, "MMM dd, yyyy")}
            </div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              <Clock className="w-3 h-3 inline mr-1" />
              Updated: {formatDate(bukid.updatedAt, "MMM dd, yyyy HH:mm")}
            </div>
          </div>
        </div>

        <div
          className="p-3 rounded-lg"
          style={{ background: "var(--card-bg)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4" style={{ color: "var(--accent-blue)" }} />
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Metadata
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${bukid.status === "active" ? "bg-green-500" : "bg-gray-400"}`}
              ></div>
              <span
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                {bukid.status || "active"}
              </span>
            </div>
            {bukid.notes && (
              <div className="text-xs text-blue-600 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Has notes
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pitaks Preview Section (if exists) */}
      {bukid.pitaks && bukid.pitaks.length > 0 && (
        <div className="p-3 rounded-lg border border-green-100 bg-green-50">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">
              Pitaks ({bukid.pitaks.length})
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {bukid.pitaks.slice(0, 4).map((pitak, index) => (
              <div
                key={pitak.id}
                className="text-xs p-2 bg-white rounded border border-green-100"
              >
                <div className="font-medium text-gray-700">
                  Pitak {index + 1}
                </div>
                <div className="text-gray-600 truncate">{pitak.location}</div>
                <div className="flex justify-between mt-1">
                  <span className="text-green-600 flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {pitak.totalLuwang} luwang
                  </span>
                  <span
                    className={`px-1 rounded ${pitak.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                  >
                    {pitak.status}
                  </span>
                </div>
              </div>
            ))}
            {bukid.pitaks.length > 4 && (
              <div className="text-xs p-2 text-center text-gray-500 flex items-center justify-center">
                <Layers className="w-3 h-3 mr-1" />+ {bukid.pitaks.length - 4}{" "}
                more pitaks
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes Section (if exists) */}
      {bukid.notes && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewNote?.(bukid.id!);
          }}
          className="tooltip-wrapper note-indicator hover:scale-110 transition-transform"
        >
          <FileText
            className="w-4 h-4 text-blue-500 hover:text-blue-600"
            style={{
              background: "rgba(59, 130, 246, 0.1)",
              borderRadius: "4px",
              padding: "2px",
            }}
          />
          <span className="tooltip-text">Click to view note</span>
        </button>
      )}
    </div>
  );

  return (
    <>
      <tr
        className="hover:bg-gray-50 transition-colors border-b border-gray-200 pointer-events-auto cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand();
        }}
        style={{ borderBottom: "1px solid var(--border-color)" }}
      >
        <td className="p-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="rounded border-gray-300"
          />
        </td>
        <td className="p-4">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ background: "var(--accent-green-light)" }}
            >
              <Home
                className="w-4 h-4"
                style={{ color: "var(--accent-green)" }}
              />
            </div>
            <div>
              <div
                className="font-medium flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <div className="tooltip-wrapper">
                  {bukid.name}
                  <span className="tooltip-text">Click to view details</span>
                </div>
                {bukid.notes && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewNote?.(bukid.id!);
                    }}
                    className="tooltip-wrapper note-indicator hover:scale-110 transition-transform"
                  >
                    <FileText
                      className="w-4 h-4 text-blue-500 hover:text-blue-600"
                      style={{
                        background: "rgba(59, 130, 246, 0.1)",
                        borderRadius: "4px",
                        padding: "2px",
                      }}
                    />
                    <span className="tooltip-text">Click to view note</span>
                  </button>
                )}
                {!bukid.location && (
                  <div className="tooltip-wrapper">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span className="tooltip-text">No location specified</span>
                  </div>
                )}
              </div>
              {bukidSummary && (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {bukidSummary.assignmentCount} assignments
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {bukidSummary.pitakCount} pitaks
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {bukidSummary.totalLuwang.toFixed(2) || 0} luwang
                  </span>
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="p-4">
          <div className="tooltip-wrapper">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 truncate max-w-[200px]">
                {bukid.location || "No location specified"}
              </span>
            </div>
            {bukid.location && (
              <span className="tooltip-text max-w-xs break-words">
                {bukid.location}
              </span>
            )}
          </div>
        </td>
        <td className="p-4">{getStatusBadge(bukid.status)}</td>
        <td className="p-4">
          <div className="text-sm text-gray-600 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(bukid.createdAt, "MMM dd, yyyy")}
          </div>
        </td>
        <td className="p-4">
          <div className="flex items-center gap-2">
            {/* Quick action buttons */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(bukid.id!);
              }}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors tooltip-wrapper"
              title="View Details"
            >
              <Eye className="w-4 h-4 text-blue-500" />
              <span className="tooltip-text">View Details</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(bukid.id!);
              }}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors tooltip-wrapper"
              title="Edit"
            >
              <Edit className="w-4 h-4 text-yellow-500" />
              <span className="tooltip-text">Edit</span>
            </button>

            {/* Bukid Actions Dropdown */}
            <BukidActionsDropdown
              bukid={bukid}
              onComplete={onComplete}
              onViewMap={onViewMap}
              onAddPlot={onAddPlot}
              onViewPlots={onViewPlots}
              onAddNote={onAddNote}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onUpdateStatus={onUpdateStatus}
              onViewStats={onViewStats}
              onViewNote={onViewNote}
              onImportCSV={onImportCSV}
              onExportCSV={onExportCSV}
            />

            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors tooltip-wrapper"
              title="More Details"
            >
              <ChevronRight
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
              />
              <span className="tooltip-text">
                {isExpanded ? "Hide Details" : "Show Details"}
              </span>
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded Row */}
      {isExpanded && (
        <tr className={isExpanded ? "expanded-row" : "collapsed-row"}>
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

export default BukidTableRow;
