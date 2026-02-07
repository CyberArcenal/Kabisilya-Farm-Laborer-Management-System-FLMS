// components/Worker/components/WorkerTableRow.tsx
import React, { useState, useEffect } from "react";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { formatDate, formatCurrency } from "../../../../utils/formatters";
import WorkerActionsDropdown from "./WorkerActionsDropdown";
import workerAPI from "../../../../apis/worker";

interface WorkerTableRowProps {
  worker: any;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onUpdateStatus: (
    id: number,
    currentStatus: string,
    newStatus: string,
  ) => void;
  onGenerateReport: (id: number) => void;
}

const WorkerTableRow: React.FC<WorkerTableRowProps> = ({
  worker,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onView,
  onEdit,
  onDelete,
  onUpdateStatus,
  onGenerateReport,
}) => {
  const [financialData, setFinancialData] = useState<{
    totalDebt: number;
    totalPaid: number;
    currentBalance: number;
    loading: boolean;
  }>({
    totalDebt: worker.totalDebt || 0,
    totalPaid: worker.totalPaid || 0,
    currentBalance: worker.currentBalance || 0,
    loading: false,
  });

  const [kabisilyaData, setKabisilyaData] = useState<any>(null);

  // Fetch financial data when row is expanded
  useEffect(() => {
    const fetchDetailedData = async () => {
      if (isExpanded) {
        setFinancialData(prev => ({ ...prev, loading: true }));
        try {
          // Fetch financial summary
          const summaryResponse = await workerAPI.getWorkerSummary(worker.id);
          if (summaryResponse.status && summaryResponse.data?.summary?.financial) {
            const { totalDebt, totalPaid, currentBalance } = summaryResponse.data.summary.financial;
            setFinancialData({
              totalDebt: totalDebt || 0,
              totalPaid: totalPaid || 0,
              currentBalance: currentBalance || 0,
              loading: false,
            });
          }
        } catch (error) {
          console.error("Failed to fetch detailed worker data:", error);
          setFinancialData(prev => ({ ...prev, loading: false }));
        }
      }
    };

    fetchDetailedData();
  }, [isExpanded, worker.id]);

  const getStatusBadge = (status: string) => {
    const config: any = {
      active: {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
        label: "Active",
      },
      inactive: {
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
        label: "Inactive",
      },
      "on-leave": {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        border: "border-yellow-200",
        label: "On Leave",
      },
      terminated: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        label: "Terminated",
      },
    };

    const cfg = config[status] || config.active;
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
      >
        {cfg.label}
      </span>
    );
  };

  const getDebtIndicator = (balance: number) => {
    if (balance === 0) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
          Settled
        </span>
      );
    } else if (balance > 0) {
      // POSITIVE balance = WORKER OWES MONEY = DEBT = RED
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
          Debt: {formatCurrency(balance)}
        </span>
      );
    } else {
      // NEGATIVE balance = COMPANY OWES WORKER = CREDIT = GREEN
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
          Credit: {formatCurrency(Math.abs(balance))}
        </span>
      );
    }
  };

  const ExpandedView = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50">
      <div className="p-3 rounded-lg bg-white border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-800">
            Worker Details
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Created:</span>
            <span className="text-sm font-medium text-gray-800">
              {formatDate(worker.createdAt, "MMM dd, yyyy HH:mm")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Updated:</span>
            <span className="text-sm font-medium text-gray-800">
              {formatDate(worker.updatedAt, "MMM dd, yyyy HH:mm")}
            </span>
          </div>
          {worker.hireDate && (
            <div className="pt-2 border-t border-gray-200">
              <span className="text-sm text-gray-600">Days Employed:</span>
              <p className="text-sm font-medium text-gray-800 mt-1">
                {Math.floor(
                  (new Date().getTime() - new Date(worker.hireDate).getTime()) /
                    (1000 * 60 * 60 * 24),
                )}{ " "}
                days
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 rounded-lg bg-white border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-800">
            Financial Summary
            {financialData.loading && (
              <Loader2 className="w-3 h-3 ml-2 animate-spin inline" />
            )}
          </span>
        </div>
        {financialData.loading ? (
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Debt:</span>
              <span className="text-sm font-medium text-red-600">
                {formatCurrency(financialData.totalDebt)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Paid:</span>
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(financialData.totalPaid)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Current Balance:</span>
              <span
                className={`text-sm font-medium ${
                  financialData.currentBalance > 0 
                    ? "text-red-600"  // Debt (worker owes)
                    : financialData.currentBalance < 0 
                    ? "text-green-600" // Credit (company owes)
                    : "text-gray-800"  // Settled
                }`}
              >
                {formatCurrency(financialData.currentBalance)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 rounded-lg bg-white border border-gray-200 hidden">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-800">
            Kabisilya Information
          </span>
        </div>
        {kabisilyaData ? (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Name:</span>
              <span className="text-sm font-medium text-gray-800">
                {kabisilyaData.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">ID:</span>
              <span className="text-sm font-medium text-gray-800">
                {kabisilyaData.id}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500">No kabisilya assigned</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <tr
        className="hover:bg-gray-200 transition-colors border-b border-gray-200 pointer-events-auto cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand();
        }}
      >
        <td className="p-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="rounded border-gray-300"
            onClick={(e) => e.stopPropagation()}
          />
        </td>
        <td className="p-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <div>
              <div className="font-medium text-gray-800">{worker.name}</div>
              <div className="text-xs text-gray-500">ID: {worker.id}</div>
            </div>
          </div>
        </td>
        <td className="p-4">
          <div className="space-y-1">
            {worker.contact && (
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-blue-500" />
                <span className="text-sm text-gray-700">{worker.contact}</span>
              </div>
            )}
            {worker.email && (
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3 text-yellow-500" />
                <span className="text-sm text-gray-700">{worker.email}</span>
              </div>
            )}
            {worker.address && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-green-500" />
                <span className="text-xs text-gray-600">
                  {worker.address.substring(0, 30)}...
                </span>
              </div>
            )}
          </div>
        </td>
        <td className="p-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div>
              <div className="font-medium text-gray-800">
                {worker.hireDate
                  ? formatDate(worker.hireDate, "MMM dd, yyyy")
                  : "Not set"}
              </div>
              {worker.hireDate && (
                <div className="text-xs text-gray-500">
                  {Math.floor(
                    (new Date().getTime() -
                      new Date(worker.hireDate).getTime()) /
                      (1000 * 60 * 60 * 24 * 365.25),
                  )}{ " "}
                  years
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="p-4">{getStatusBadge(worker.status)}</td>
        <td className="p-4">
          <div className="space-y-1">
            {getDebtIndicator(financialData.totalDebt)}
            <div className="text-xs text-gray-600">
              Paid: <span className="text-green-600">{formatCurrency(financialData.totalPaid)}</span>
            </div>
          </div>
        </td>
        <td className="p-4">
          <div className="flex items-center gap-2">
            <WorkerActionsDropdown
              worker={worker}
              onView={() => onView(worker.id)}
              onEdit={() => onEdit(worker.id)}
              onDelete={() => onDelete(worker.id)}
              onUpdateStatus={(newStatus: string) =>
                onUpdateStatus(worker.id, worker.status, newStatus)
              }
              onGenerateReport={() => onGenerateReport(worker.id)}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="p-1.5 rounded hover:bg-gray-100"
              title="More Details"
            >
              <ChevronRight
                className={`w-4 h-4 transition-transform cursor-pointer ${isExpanded ? "rotate-90" : ""}`}
              />
            </button>
          </div>
        </td>
      </tr>

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

export default WorkerTableRow;