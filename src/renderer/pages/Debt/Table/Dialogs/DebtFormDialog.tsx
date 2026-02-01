// components/Debt/Dialogs/DebtFormDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  X, Save, DollarSign, User, Calendar, Percent, Clock,
  AlertCircle, CheckCircle, Loader, FileText, Shield, Calculator,
  TrendingUp, Info, Hash, Phone, Mail
} from 'lucide-react';
import debtAPI from '../../../../apis/debt';
import workerAPI from '../../../../apis/worker';
import { showError, showSuccess } from '../../../../utils/notification';
import { dialogs } from '../../../../utils/dialogs';

interface DebtFormDialogProps {
  id?: number;
  mode: 'add' | 'edit';
  onClose: () => void;
  onSuccess?: (debt: any) => void;
}

interface FormData {
  worker_id: number | null;
  amount: number;
  reason: string;
  dueDate: string;
  interestRate: number;
  paymentTerm: string;
  notes: string;
}

interface DebtLimitCheck {
  isWithinLimit: boolean;
  currentDebt: number;
  proposedDebt: number;
  debtLimit: number;
  remainingLimit: number;
  canProceed: boolean;
}

const DebtFormDialog: React.FC<DebtFormDialogProps> = ({
  id,
  mode,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    worker_id: null,
    amount: 0,
    reason: '',
    dueDate: '',
    interestRate: 0,
    paymentTerm: '30',
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [workers, setWorkers] = useState<any[]>([]);
  const [limitCheck, setLimitCheck] = useState<DebtLimitCheck | null>(null);
  const [interestPreview, setInterestPreview] = useState<{
    interest: number;
    totalAmount: number;
  } | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    message: string;
  }>({
    isValid: false,
    message: ''
  });

  // Common payment terms
  const paymentTerms = [
    { value: '7', label: '7 days (1 week)' },
    { value: '14', label: '14 days (2 weeks)' },
    { value: '30', label: '30 days (1 month)' },
    { value: '60', label: '60 days (2 months)' },
    { value: '90', label: '90 days (3 months)' },
    { value: '180', label: '180 days (6 months)' },
    { value: '365', label: '365 days (1 year)' }
  ];

  // Common interest rates
  const interestRates = [
    { value: 0, label: '0% (No interest)' },
    { value: 5, label: '5% (Low)' },
    { value: 10, label: '10% (Standard)' },
    { value: 15, label: '15% (High)' },
    { value: 20, label: '20% (Premium)' }
  ];

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch workers for dropdown
        const workerResponse = await workerAPI.getAllWorkers({ limit: 1000 });
        if (workerResponse.status && workerResponse.data?.workers) {
          const activeWorkers = workerResponse.data.workers.filter(
            worker => worker.status === 'active' || worker.status === 'on-leave'
          );
          setWorkers(activeWorkers);
        }

        // Fetch debt data if in edit mode
        if (mode === 'edit' && id) {
          const debtId = parseInt(id.toString());
          const response = await debtAPI.getById(debtId);

          if (response.status) {
            const debtData = response.data;
            setFormData({
              worker_id: debtData.worker.id,
              amount: debtData.amount,
              reason: debtData.reason || '',
              dueDate: debtData.dueDate ? debtData.dueDate.split('T')[0] : '',
              interestRate: debtData.interestRate,
              paymentTerm: debtData.paymentTerm || '30',
              notes: debtData.notes || ''
            });

            // Find and set selected worker
            const worker = workers.find(w => w.id === debtData.worker.id);
            if (worker) setSelectedWorker(worker);

            // Calculate interest preview
            if (debtData.interestRate > 0 && debtData.dueDate) {
              const dueDate = new Date(debtData.dueDate);
              const incurredDate = new Date(debtData.dateIncurred);
              const daysDiff = Math.ceil((dueDate.getTime() - incurredDate.getTime()) / (1000 * 60 * 60 * 24));
              
              const interestCalc = await debtAPI.calculateInterest({
                principal: debtData.amount,
                interestRate: debtData.interestRate,
                days: daysDiff > 0 ? daysDiff : 0
              });
              
              if (interestCalc.status) {
                setInterestPreview({
                  interest: interestCalc.data.interest,
                  totalAmount: interestCalc.data.totalAmount
                });
              }
            }
          } else {
            showError('Debt record not found');
            onClose();
          }
        } else {
          // Set default due date to 30 days from now for new debts
          const defaultDueDate = new Date();
          defaultDueDate.setDate(defaultDueDate.getDate() + 30);
          setFormData(prev => ({
            ...prev,
            dueDate: defaultDueDate.toISOString().split('T')[0]
          }));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        showError('Failed to load form data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, mode, onClose]);

  // Handle form input changes
  const handleChange = (field: keyof FormData, value: string | number | null) => {
    const newFormData = {
      ...formData,
      [field]: value
    };
    
    setFormData(newFormData);

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Recalculate limit check if worker or amount changes
    if ((field === 'worker_id' && value) || field === 'amount') {
      if (newFormData.worker_id && newFormData.amount > 0) {
        checkDebtLimit(newFormData.worker_id, newFormData.amount);
      }
    }

    // Calculate interest preview if amount, interest rate, or due date changes
    if (field === 'amount' || field === 'interestRate' || field === 'dueDate') {
      calculateInterestPreview(newFormData);
    }

    // Validate form
    validateField(field, value);
  };

  // Handle worker selection
  const handleWorkerSelect = (workerId: number | null) => {
    if (workerId) {
      const worker = workers.find(w => w.id === workerId);
      setSelectedWorker(worker);
      handleChange('worker_id', workerId);
    } else {
      setSelectedWorker(null);
      handleChange('worker_id', null);
    }
  };

  // Validate individual field
  const validateField = (field: keyof FormData, value: any) => {
    let isValid = true;
    let message = '';

    switch (field) {
      case 'amount':
        if (!value || value <= 0) {
          isValid = false;
          message = 'Amount must be greater than 0';
        } else if (value > 1000000) {
          isValid = false;
          message = 'Amount cannot exceed 1,000,000';
        }
        break;
      case 'reason':
        if (!value || value.trim().length === 0) {
          isValid = false;
          message = 'Reason is required';
        } else if (value.length > 500) {
          isValid = false;
          message = 'Reason must be less than 500 characters';
        }
        break;
      case 'dueDate':
        if (!value) {
          isValid = false;
          message = 'Due date is required';
        } else {
          const dueDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (dueDate < today) {
            isValid = false;
            message = 'Due date cannot be in the past';
          }
        }
        break;
    }

    setValidationState({
      isValid,
      message
    });

    return isValid;
  };

  // Check debt limit for selected worker
  const checkDebtLimit = async (workerId: number, amount: number) => {
    try {
      const response = await debtAPI.checkLimit(workerId, amount);
      if (response.status) {
        setLimitCheck(response.data);
      }
    } catch (error) {
      console.error('Error checking debt limit:', error);
    }
  };

  // Calculate interest preview
  const calculateInterestPreview = async (data: FormData) => {
    if (data.amount > 0 && data.interestRate > 0 && data.dueDate) {
      try {
        const dueDate = new Date(data.dueDate);
        const today = new Date();
        const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > 0) {
          const response = await debtAPI.calculateInterest({
            principal: data.amount,
            interestRate: data.interestRate,
            days: daysDiff,
            compoundingPeriod: 'daily'
          });
          
          if (response.status) {
            setInterestPreview({
              interest: response.data.interest,
              totalAmount: response.data.totalAmount
            });
          }
        } else {
          setInterestPreview({
            interest: 0,
            totalAmount: data.amount
          });
        }
      } catch (error) {
        console.error('Error calculating interest:', error);
      }
    } else {
      setInterestPreview({
        interest: 0,
        totalAmount: data.amount
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.worker_id) {
      newErrors.worker_id = 'Please select a worker';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (formData.amount > 1000000) {
      newErrors.amount = 'Amount cannot exceed 1,000,000';
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'Please provide a reason for the debt';
    } else if (formData.reason.length > 500) {
      newErrors.reason = 'Reason must be less than 500 characters';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Please select a due date';
    } else {
      const dueDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        newErrors.dueDate = 'Due date cannot be in the past';
      }
    }

    if (formData.interestRate < 0 || formData.interestRate > 100) {
      newErrors.interestRate = 'Interest rate must be between 0 and 100';
    }

    if (formData.paymentTerm && parseInt(formData.paymentTerm) <= 0) {
      newErrors.paymentTerm = 'Payment term must be greater than 0';
    }

    if (formData.notes.length > 1000) {
      newErrors.notes = 'Notes must be less than 1000 characters';
    }

    // Check debt limit
    if (limitCheck && !limitCheck.canProceed) {
      newErrors.amount = `Debt limit exceeded. Current debt: ₱${limitCheck.currentDebt.toLocaleString()}, Limit: ₱${limitCheck.debtLimit.toLocaleString()}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showError('Please fix the errors in the form');
      return;
    }

    if (!await dialogs.confirm({
      title: mode === 'add' ? 'Create Debt' : 'Update Debt',
      message: `Are you sure you want to ${mode === 'add' ? 'create' : 'update'} this debt?`
    })) return;

    try {
      setSubmitting(true);

      // Prepare data for API
      const debtData: any = {
        worker_id: formData.worker_id!,
        amount: parseFloat(formData.amount.toFixed(2)),
        reason: formData.reason.trim(),
        dueDate: formData.dueDate,
        interestRate: parseFloat(formData.interestRate.toFixed(2))
      };

      // Add optional fields if they have values
      if (formData.paymentTerm.trim()) {
        debtData.paymentTerm = formData.paymentTerm.trim();
      }

      if (formData.notes.trim()) {
        debtData.notes = formData.notes.trim();
      }

      let response;

      if (mode === 'add') {
        // Create new debt with validation
        response = await debtAPI.validateAndCreateDebt(debtData);
      } else if (mode === 'edit' && id) {
        // Update existing debt
        debtData.id = parseInt(id.toString());
        response = await debtAPI.update(debtData);
      }

      if (response?.status) {
        showSuccess(
          mode === 'add'
            ? 'Debt created successfully!'
            : 'Debt updated successfully!'
        );

        if (onSuccess) {
          onSuccess(response.data);
        }
        onClose();
      } else {
        throw new Error(response?.message || 'Failed to save debt');
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);
      showError(error.message || 'Failed to save debt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4 windows-fade-in">
      <div className="bg-white rounded-lg w-full max-w-4xl shadow-xl border border-gray-200 windows-modal">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 windows-title">
                {mode === 'add' ? 'Create New Debt' : 'Edit Debt'}
              </h3>
              <div className="text-sm text-gray-600 windows-text">
                {mode === 'add' 
                  ? 'Record a new debt for a worker' 
                  : `Editing Debt #${id || ''}`}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors windows-button-secondary"
            title="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600 windows-text">
                {mode === 'add' ? 'Loading form...' : 'Loading debt data...'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Worker & Amount */}
                <div className="space-y-6">
                  {/* Worker Selection Card */}
                  <div className="windows-card p-5">
                    <h4 className="text-base font-semibold text-gray-900 mb-4 windows-title flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      Worker Selection
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 windows-text">
                          Select Worker <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.worker_id || ''}
                          onChange={(e) => handleWorkerSelect(e.target.value ? parseInt(e.target.value) : null)}
                          className={`windows-input ${errors.worker_id ? 'border-red-500' : ''}`}
                          disabled={submitting || mode === 'edit'}
                        >
                          <option value="">Select a worker...</option>
                          {workers.map((worker) => (
                            <option key={worker.id} value={worker.id}>
                              {worker.name} ({worker.contact || 'No contact'})
                            </option>
                          ))}
                        </select>
                        {errors.worker_id && (
                          <p className="mt-2 text-xs flex items-center gap-1 text-red-600 windows-text">
                            <AlertCircle className="w-3 h-3" />
                            {errors.worker_id}
                          </p>
                        )}
                      </div>

                      {/* Selected Worker Info */}
                      {selectedWorker && (
                        <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-gray-50 border border-gray-200">
                          <div className="flex items-start gap-3">
                            <User className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <h5 className="text-sm font-medium text-gray-900 windows-title">
                                {selectedWorker.name}
                              </h5>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {selectedWorker.contact && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <Phone className="w-3 h-3 text-gray-500" />
                                    <span className="text-gray-600 windows-text">{selectedWorker.contact}</span>
                                  </div>
                                )}
                                {selectedWorker.email && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <Mail className="w-3 h-3 text-gray-500" />
                                    <span className="text-gray-600 windows-text">{selectedWorker.email}</span>
                                  </div>
                                )}
                                <div className="col-span-2">
                                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 windows-text">
                                    {selectedWorker.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Amount Card */}
                  <div className="windows-card p-5">
                    <h4 className="text-base font-semibold text-gray-900 mb-4 windows-title flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      Debt Amount
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 windows-text" htmlFor="amount">
                          Amount <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                            <span className="text-gray-500 windows-text">₱</span>
                          </div>
                          <input
                            id="amount"
                            type="number"
                            min="0.01"
                            max="1000000"
                            step="0.01"
                            value={formData.amount || ''}
                            onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                            className={`windows-input pl-8! ${errors.amount ? 'border-red-500' : ''}`}
                            placeholder="0.00"
                            required
                            disabled={submitting}
                          />
                          {formData.amount > 0 && !errors.amount && (
                            <div className="mt-2 flex items-center gap-1.5">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-xs text-green-600 windows-text">
                                {formData.amount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}
                              </span>
                            </div>
                          )}
                        </div>
                        {errors.amount && (
                          <p className="mt-2 text-xs flex items-center gap-1 text-red-600 windows-text">
                            <AlertCircle className="w-3 h-3" />
                            {errors.amount}
                          </p>
                        )}
                      </div>

                      {/* Debt Limit Check */}
                      {limitCheck && (
                        <div className={`p-4 rounded-lg border ${
                          limitCheck.canProceed 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className={`w-4 h-4 ${
                              limitCheck.canProceed ? 'text-green-600' : 'text-red-600'
                            }`} />
                            <h3 className="text-sm font-medium windows-title">
                              Debt Limit Check
                            </h3>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs windows-text">
                            <div>
                              <div className="text-gray-600">Current Debt</div>
                              <div className="font-medium">₱{limitCheck.currentDebt.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-gray-600">Remaining Limit</div>
                              <div className={`font-medium ${
                                limitCheck.remainingLimit < 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                ₱{limitCheck.remainingLimit.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Terms & Interest */}
                <div className="space-y-6">
                  {/* Due Date & Reason Card */}
                  <div className="windows-card p-5">
                    <h4 className="text-base font-semibold text-gray-900 mb-4 windows-title flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-amber-600" />
                      Due Date & Reason
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 windows-text" htmlFor="dueDate">
                          Due Date <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                          </div>
                          <input
                            id="dueDate"
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => handleChange('dueDate', e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className={`windows-input pl-10! ${errors.dueDate ? 'border-red-500' : ''}`}
                            required
                            disabled={submitting}
                          />
                        </div>
                        {errors.dueDate && (
                          <p className="mt-2 text-xs flex items-center gap-1 text-red-600 windows-text">
                            <AlertCircle className="w-3 h-3" />
                            {errors.dueDate}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 windows-text" htmlFor="reason">
                          Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="reason"
                          value={formData.reason}
                          onChange={(e) => handleChange('reason', e.target.value)}
                          className={`windows-input min-h-[100px] resize-y ${errors.reason ? 'border-red-500' : ''}`}
                          placeholder="Enter the reason for this debt..."
                          required
                          disabled={submitting}
                          rows={3}
                        />
                        {errors.reason && (
                          <p className="mt-2 text-xs flex items-center gap-1 text-red-600 windows-text">
                            <AlertCircle className="w-3 h-3" />
                            {errors.reason}
                          </p>
                        )}
                        <div className="mt-2 text-xs text-gray-500 windows-text flex justify-between">
                          <span>Be descriptive to help track the purpose</span>
                          <span className={formData.reason.length > 500 ? 'text-red-600' : ''}>
                            {formData.reason.length}/500
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interest & Terms Card */}
                  <div className="windows-card p-5">
                    <h4 className="text-base font-semibold text-gray-900 mb-4 windows-title flex items-center gap-2">
                      <Percent className="w-5 h-5 text-purple-600" />
                      Interest & Terms
                    </h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700 windows-text" htmlFor="interestRate">
                            Interest Rate (%)
                          </label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                              <Percent className="w-4 h-4 text-gray-400" />
                            </div>
                            <input
                              id="interestRate"
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={formData.interestRate}
                              onChange={(e) => handleChange('interestRate', parseFloat(e.target.value) || 0)}
                              className={`windows-input pl-10! ${errors.interestRate ? 'border-red-500' : ''}`}
                              placeholder="0.0"
                              disabled={submitting}
                            />
                          </div>
                          {errors.interestRate && (
                            <p className="mt-2 text-xs flex items-center gap-1 text-red-600 windows-text">
                              <AlertCircle className="w-3 h-3" />
                              {errors.interestRate}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700 windows-text" htmlFor="paymentTerm">
                            Payment Term (days)
                          </label>
                          <select
                            id="paymentTerm"
                            value={formData.paymentTerm}
                            onChange={(e) => handleChange('paymentTerm', e.target.value)}
                            className={`windows-input ${errors.paymentTerm ? 'border-red-500' : ''}`}
                            disabled={submitting}
                          >
                            {paymentTerms.map((term) => (
                              <option key={term.value} value={term.value}>
                                {term.label}
                              </option>
                            ))}
                          </select>
                          {errors.paymentTerm && (
                            <p className="mt-2 text-xs flex items-center gap-1 text-red-600 windows-text">
                              <AlertCircle className="w-3 h-3" />
                              {errors.paymentTerm}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Interest Rate Quick Select */}
                      <div>
                        <h5 className="text-sm font-medium mb-2 text-gray-700 windows-text">
                          Quick Select Interest Rates
                        </h5>
                        <div className="grid grid-cols-2 gap-2">
                          {interestRates.map((rate) => (
                            <button
                              key={rate.value}
                              type="button"
                              onClick={() => handleChange('interestRate', rate.value)}
                              className={`p-2 rounded-lg text-sm text-left transition-all ${
                                formData.interestRate === rate.value
                                  ? 'bg-purple-100 border-2 border-purple-600'
                                  : 'bg-gray-50 border border-gray-200 hover:border-purple-400'
                              }`}
                              disabled={submitting}
                            >
                              <div className="font-medium text-gray-800 windows-text">
                                {rate.value}%
                              </div>
                              <div className="text-xs mt-1 text-gray-600 windows-text">
                                {rate.label.split('(')[1].replace(')', '')}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Interest Preview */}
                      {interestPreview && formData.amount > 0 && formData.interestRate > 0 && (
                        <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-blue-50 border border-gray-200">
                          <h5 className="text-sm font-medium mb-3 text-gray-700 windows-text flex items-center gap-2">
                            <Calculator className="w-4 h-4" />
                            Interest Calculation Preview
                          </h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                              <div className="text-lg font-bold text-green-600">
                                ₱{formData.amount.toLocaleString()}
                              </div>
                              <div className="text-xs mt-1 text-gray-600 windows-text">
                                Principal
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-purple-600">
                                ₱{interestPreview.interest.toLocaleString()}
                              </div>
                              <div className="text-xs mt-1 text-gray-600 windows-text">
                                Interest
                              </div>
                            </div>
                            <div className="col-span-2 text-center pt-4 border-t border-gray-200">
                              <div className="text-xl font-bold text-blue-600">
                                ₱{interestPreview.totalAmount.toLocaleString()}
                              </div>
                              <div className="text-xs mt-1 text-gray-600 windows-text">
                                Total Amount Due
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Card - Full Width */}
              <div className="windows-card p-5">
                <h4 className="text-base font-semibold text-gray-900 mb-4 windows-title flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  Additional Notes (Optional)
                </h4>
                <div>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    className={`windows-input min-h-[100px] resize-y ${errors.notes ? 'border-red-500' : ''}`}
                    placeholder="Enter any additional notes about this debt..."
                    disabled={submitting}
                    rows={3}
                  />
                  {errors.notes && (
                    <p className="mt-2 text-xs flex items-center gap-1 text-red-600 windows-text">
                      <AlertCircle className="w-3 h-3" />
                      {errors.notes}
                    </p>
                  )}
                  <div className="mt-2 text-xs text-gray-500 windows-text flex justify-between">
                    <span>Add detailed information for better debt management</span>
                    <span className={formData.notes.length > 1000 ? 'text-red-600' : ''}>
                      {formData.notes.length}/1000
                    </span>
                  </div>
                </div>
              </div>

              {/* Information Section */}
              {mode === 'add' && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-700 windows-text">
                      <p className="font-medium mb-2">Debt Management Information</p>
                      <p>A debt record allows you to:</p>
                      <ul className="list-disc list-inside mt-1 ml-1 space-y-1">
                        <li>Track worker loans and advances</li>
                        <li>Calculate interest automatically</li>
                        <li>Set payment deadlines and terms</li>
                        <li>Monitor payment history</li>
                        <li>Generate debt reports</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600 windows-text">
              <AlertCircle className="w-4 h-4" />
              <span>Fields marked with <span className="text-red-500">*</span> are required</span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="windows-button windows-button-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={submitting}
                className="windows-button windows-button-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    {mode === 'add' ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {mode === 'add' ? 'Create Debt' : 'Update Debt'}
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

export default DebtFormDialog;