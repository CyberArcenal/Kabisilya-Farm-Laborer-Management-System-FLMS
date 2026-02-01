import { kabAuthStore } from "../lib/kabAuthStore";
import type { WorkerData } from "./worker";

// Debt Management API - Similar structure to activationAPI.ts
export interface DebtData {
  notes: string;
  id: number;
  originalAmount: number;
  amount: number;
  balance: number;
  reason: string | null;
  status: 'pending' | 'partially_paid' | 'paid' | 'cancelled' | 'overdue';
  dateIncurred: string;
  dueDate: string | null;
  paymentTerm: string | null;
  interestRate: number;
  totalInterest: number;
  totalPaid: number;
  lastPaymentDate: string | null;
  createdAt: string;
  updatedAt: string;
  worker: WorkerData;
  history?: DebtHistoryData[];
}

export interface DebtHistoryData {
  id: number;
  amountPaid: number;
  previousBalance: number;
  newBalance: number;
  transactionType: 'payment' | 'adjustment' | 'interest' | 'refund';
  paymentMethod: string | null;
  referenceNumber: string | null;
  notes: string | null;
  transactionDate: string;
  createdAt: string;
}

export interface DebtFilters {
  status?: string;
  worker_id?: number;
  date_from?: string;
  date_to?: string;
  only_active?: boolean;
  due_soon?: boolean;
}

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

export interface PaymentRequest {
  debt_id: number;
  amount: number;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface InterestRequest {
  debt_id: number;
  interestAmount: number;
  notes?: string;
}

export interface DebtCreationRequest {
  worker_id: number;
  amount: number;
  reason?: string;
  dueDate?: string;
  interestRate?: number;
  paymentTerm?: string;
}

export interface DebtUpdateRequest {
  id: number;
  amount?: number;
  reason?: string;
  dueDate?: string;
  interestRate?: number;
  paymentTerm?: string;
  notes?: string;
}

export interface DebtReportData {
  debts: DebtData[];
  summary: {
    totalDebts: number;
    totalAmount: number;
    totalBalance: number;
    totalPaid: number;
    totalInterest: number;
    byStatus: Record<string, number>;
    byWorker: Record<number, {
      workerName: string;
      totalDebt: number;
      totalBalance: number;
      count: number;
    }>;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export interface WorkerDebtSummary {
  worker: WorkerData;
  totalDebt: number;
  totalBalance: number;
  totalPaid: number;
  activeDebts: number;
  overdueDebts: number;
}

export interface DebtLimitCheck {
  isWithinLimit: boolean;
  currentDebt: number;
  proposedDebt: number;
  debtLimit: number;
  remainingLimit: number;
  canProceed: boolean;
}

export interface InterestCalculation {
  principal: number;
  interestRate: number;
  days: number;
  compoundingPeriod: string;
  interest: number;
  totalAmount: number;
}

export interface DebtStats {
  totalDebts: number;
  activeCount: number;
  overdueCount: number;
  pendingCount: number;
  partiallyPaidCount: number;
  paidCount: number;
  cancelledCount: number;
  totalAmount: number;
  totalBalance: number;
  totalPaid: number;
}

export interface DebtResponse<T = any> {
  status: boolean;
  message: string;
  data: T;
}

export interface DebtPayload {
  method: string;
  params?: Record<string, any>;
}


class DebtAPI {
  // Helper method to get current user ID
  private getCurrentUserId(): number | null {
    try {
      const user = kabAuthStore.getUser();
      if (user && user.id) {
        // Ensure we return a number
        const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
        return isNaN(userId) ? null : userId;
      }
      return null;
    } catch (error) {
      console.error("Error getting current user ID:", error);
      return null;
    }
  }

  // Helper method to enrich params with userId
  private enrichParams(params: any = {}): any {
    const userId = this.getCurrentUserId();
    return { ...params, userId: userId !== null ? userId : 0 };
  }

  // 📋 Read-only methods
  async getAll(filters: DebtFilters = {}): Promise<DebtResponse<DebtData[]>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "getAllDebts",
        params: this.enrichParams({ filters }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to get all debts");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get all debts");
    }
  }

  async getById(id: number): Promise<DebtResponse<DebtData>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "getDebtById",
        params: this.enrichParams({ id }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to get debt");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get debt");
    }
  }

  async getByWorker(workerId: number, filters: DebtFilters = {}): Promise<DebtResponse<{ debts: DebtData[], totals: any }>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "getDebtsByWorker",
        params: this.enrichParams({ worker_id: workerId, filters }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to get worker debts");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get worker debts");
    }
  }

  async getByStatus(status: string, filters: DebtFilters = {}): Promise<DebtResponse<DebtData[]>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "getDebtsByStatus",
        params: this.enrichParams({ status, filters }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to get debts by status");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get debts by status");
    }
  }

  async getActive(filters: DebtFilters = {}): Promise<DebtResponse<DebtData[]>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "getActiveDebts",
        params: this.enrichParams({ filters }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to get active debts");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get active debts");
    }
  }

  async getOverdue(filters: DebtFilters = {}): Promise<DebtResponse<DebtData[]>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "getOverdueDebts",
        params: this.enrichParams({ filters }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to get overdue debts");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get overdue debts");
    }
  }

  async getHistory(debtId: number): Promise<DebtResponse<DebtHistoryData[]>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "getDebtHistory",
        params: this.enrichParams({ debt_id: debtId }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to get debt history");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get debt history");
    }
  }

  async search(query: string): Promise<DebtResponse<DebtData[]>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "searchDebts",
        params: this.enrichParams({ query }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to search debts");
    } catch (error: any) {
      throw new Error(error.message || "Failed to search debts");
    }
  }

  // 📊 Report methods
  async getReport(dateRange: DateRange = {}, filters: DebtFilters = {}): Promise<DebtResponse<DebtReportData>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "getDebtReport",
        params: this.enrichParams({ date_range: dateRange, filters }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to get debt report");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get debt report");
    }
  }

  async getWorkerSummary(workerId: number): Promise<DebtResponse<WorkerDebtSummary>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "getWorkerDebtSummary",
        params: this.enrichParams({ worker_id: workerId }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to get worker debt summary");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get worker debt summary");
    }
  }

  async getCollectionReport(dateRange: DateRange = {}): Promise<DebtResponse<any>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "getDebtCollectionReport",
        params: this.enrichParams({ date_range: dateRange }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to get collection report");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get collection report");
    }
  }

  // ✏️ Write methods
  async create(data: DebtCreationRequest): Promise<DebtResponse<DebtData>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "createDebt",
        params: this.enrichParams(data),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to create debt");
    } catch (error: any) {
      throw new Error(error.message || "Failed to create debt");
    }
  }

  async update(data: DebtUpdateRequest): Promise<DebtResponse<DebtData>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "updateDebt",
        params: this.enrichParams(data),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to update debt");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update debt");
    }
  }

  async delete(id: number): Promise<DebtResponse<{ id: number }>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "deleteDebt",
        params: this.enrichParams({ id }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to delete debt");
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete debt");
    }
  }

  async updateStatus(id: number, status: string): Promise<DebtResponse<DebtData>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "updateDebtStatus",
        params: this.enrichParams({ id, status }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to update debt status");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update debt status");
    }
  }

  async makePayment(payment: PaymentRequest): Promise<DebtResponse<any>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "makePayment",
        params: this.enrichParams(payment),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to process payment");
    } catch (error: any) {
      throw new Error(error.message || "Failed to process payment");
    }
  }

  async addInterest(interest: InterestRequest): Promise<DebtResponse<any>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "addInterest",
        params: this.enrichParams(interest),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to add interest");
    } catch (error: any) {
      throw new Error(error.message || "Failed to add interest");
    }
  }

  async adjustDebt(id: number, adjustmentData: any): Promise<DebtResponse<DebtData>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "adjustDebt",
        params: this.enrichParams({ id, ...adjustmentData }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to adjust debt");
    } catch (error: any) {
      throw new Error(error.message || "Failed to adjust debt");
    }
  }

  // 🔄 Batch operations
  async bulkCreate(debts: DebtCreationRequest[]): Promise<DebtResponse<any>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "bulkCreateDebts",
        params: this.enrichParams({ debts }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to bulk create debts");
    } catch (error: any) {
      throw new Error(error.message || "Failed to bulk create debts");
    }
  }

  async importFromCSV(filePath: string): Promise<DebtResponse<any>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "importDebtsFromCSV",
        params: this.enrichParams({ filePath }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to import debts from CSV");
    } catch (error: any) {
      throw new Error(error.message || "Failed to import debts from CSV");
    }
  }

  async exportToCSV(filters: DebtFilters = {}): Promise<DebtResponse<{ filePath: string }>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "exportDebtsToCSV",
        params: this.enrichParams({ filters }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to export debts to CSV");
    } catch (error: any) {
      throw new Error(error.message || "Failed to export debts to CSV");
    }
  }

  async bulkUpdateStatus(debtIds: number[], status: string): Promise<DebtResponse<any>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "bulkUpdateStatus",
        params: this.enrichParams({ debtIds, status }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to bulk update status");
    } catch (error: any) {
      throw new Error(error.message || "Failed to bulk update status");
    }
  }

  // 💰 Payment operations
  async processPayment(paymentData: any): Promise<DebtResponse<any>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "processPayment",
        params: this.enrichParams(paymentData),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to process payment");
    } catch (error: any) {
      throw new Error(error.message || "Failed to process payment");
    }
  }

  async reversePayment(debtHistoryId: number, reason: string): Promise<DebtResponse<any>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "reversePayment",
        params: this.enrichParams({ debt_history_id: debtHistoryId, reason }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to reverse payment");
    } catch (error: any) {
      throw new Error(error.message || "Failed to reverse payment");
    }
  }

  async getPaymentHistory(debtId: number): Promise<DebtResponse<DebtHistoryData[]>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "getPaymentHistory",
        params: this.enrichParams({ debt_id: debtId }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to get payment history");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get payment history");
    }
  }

  // ⚙️ Validation methods
  async validateData(data: DebtCreationRequest): Promise<DebtResponse<{ errors: string[] }>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "validateDebtData",
        params: this.enrichParams(data),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to validate debt data");
    } catch (error: any) {
      throw new Error(error.message || "Failed to validate debt data");
    }
  }

  async checkLimit(workerId: number, newDebtAmount: number): Promise<DebtResponse<DebtLimitCheck>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "checkDebtLimit",
        params: this.enrichParams({ worker_id: workerId, newDebtAmount }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to check debt limit");
    } catch (error: any) {
      throw new Error(error.message || "Failed to check debt limit");
    }
  }

  async calculateInterest(params: {
    principal: number;
    interestRate: number;
    days: number;
    compoundingPeriod?: string;
  }): Promise<DebtResponse<InterestCalculation>> {
    try {
      if (!window.backendAPI || !window.backendAPI.debt) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.debt({
        method: "calculateInterest",
        params: this.enrichParams(params),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to calculate interest");
    } catch (error: any) {
      throw new Error(error.message || "Failed to calculate interest");
    }
  }

  // Utility methods
  async getStats(): Promise<DebtResponse<DebtStats>> {
    try {
      const allDebts = await this.getAll();
      const activeDebts = await this.getActive();
      const overdueDebts = await this.getOverdue();
      const pendingDebts = await this.getByStatus('pending');
      const partiallyPaidDebts = await this.getByStatus('partially_paid');
      const paidDebts = await this.getByStatus('paid');
      const cancelledDebts = await this.getByStatus('cancelled');

      const stats: DebtStats = {
        totalDebts: allDebts.data.length,
        activeCount: activeDebts.data.length,
        overdueCount: overdueDebts.data.length,
        pendingCount: pendingDebts.data.length,
        partiallyPaidCount: partiallyPaidDebts.data.length,
        paidCount: paidDebts.data.length,
        cancelledCount: cancelledDebts.data.length,
        totalAmount: allDebts.data.reduce((sum, debt) => sum + debt.amount, 0),
        totalBalance: allDebts.data.reduce((sum, debt) => sum + debt.balance, 0),
        totalPaid: allDebts.data.reduce((sum, debt) => sum + debt.totalPaid, 0),
      };

      return {
        status: true,
        message: "Debt stats calculated",
        data: stats
      };
    } catch (error: any) {
      throw new Error(error.message || "Failed to calculate debt stats");
    }
  }

  async getTotalDebtByWorker(workerId: number): Promise<number> {
    try {
      const response = await this.getByWorker(workerId);
      return response.data.totals?.totalBalance || 0;
    } catch (error) {
      console.error("Error getting total debt by worker:", error);
      return 0;
    }
  }

  async isDebtOverdue(debtId: number): Promise<boolean> {
    try {
      const debt = await this.getById(debtId);
      if (!debt.data.dueDate) return false;
      
      const dueDate = new Date(debt.data.dueDate);
      const today = new Date();
      return debt.data.balance > 0 && dueDate < today;
    } catch (error) {
      console.error("Error checking if debt is overdue:", error);
      return false;
    }
  }

  async canMakePayment(debtId: number, amount: number): Promise<boolean> {
    try {
      const debt = await this.getById(debtId);
      return debt.data.balance >= amount && amount > 0;
    } catch (error) {
      console.error("Error checking if payment can be made:", error);
      return false;
    }
  }

  async validateAndCreateDebt(data: DebtCreationRequest): Promise<DebtResponse<DebtData>> {
    try {
      // Validate data first
      const validation = await this.validateData(data);
      if (!validation.data.errors || validation.data.errors.length > 0) {
        return {
          status: false,
          message: validation.data.errors?.join(', ') || "Validation failed",
          data: null as any
        };
      }

      // Check debt limit
      const limitCheck = await this.checkLimit(data.worker_id, data.amount);
      if (!limitCheck.data.canProceed) {
        return {
          status: false,
          message: `Debt limit exceeded. Current: ${limitCheck.data.currentDebt}, Proposed: ${limitCheck.data.proposedDebt}, Limit: ${limitCheck.data.debtLimit}`,
          data: null as any
        };
      }

      // Create debt
      return await this.create(data);
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to validate and create debt",
        data: null as any
      };
    }
  }

  async getActiveDebtCount(): Promise<number> {
    try {
      const activeDebts = await this.getActive();
      return activeDebts.data.length;
    } catch (error) {
      console.error("Error getting active debt count:", error);
      return 0;
    }
  }

  async getTotalOverdueAmount(): Promise<number> {
    try {
      const overdueDebts = await this.getOverdue();
      return overdueDebts.data.reduce((sum, debt) => sum + debt.balance, 0);
    } catch (error) {
      console.error("Error getting total overdue amount:", error);
      return 0;
    }
  }
}

const debtAPI = new DebtAPI();

export default debtAPI;