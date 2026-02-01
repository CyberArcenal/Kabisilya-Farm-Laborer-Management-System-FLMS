// pages/DebtFormPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, X, User, DollarSign, Calendar, AlertCircle,
  CheckCircle, XCircle, Loader, FileText, Percent, Hash,
  Clock, Info, TrendingUp, Calculator, Shield
} from 'lucide-react';
import type { WorkerData } from '../../../apis/worker';
import type { DebtData, DebtCreationRequest, DebtUpdateRequest } from '../../../apis/debt';
import debtAPI from '../../../apis/debt';
import workerAPI from '../../../apis/worker';
import { showError, showSuccess } from '../../../utils/notification';
import { dialogs } from '../../../utils/dialogs';
import WorkerSelect from '../../../components/Selects/Worker';

interface DebtFormPageProps { }

interface FormData {
  worker_id: number | null;
  amount: number;
  reason: string;
  dueDate: string;
  interestRate: number;
  paymentTerm: string;
  notes: string;
}

const DebtFormPage: React.FC<DebtFormPageProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
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
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [debt, setDebt] = useState<DebtData | null>(null);
  const [limitCheck, setLimitCheck] = useState<{
    isWithinLimit: boolean;
    currentDebt: number;
    proposedDebt: number;
    debtLimit: number;
    remainingLimit: number;
    canProceed: boolean;
  } | null>(null);
  const [interestPreview, setInterestPreview] = useState<{
    interest: number;
    totalAmount: number;
  } | null>(null);

  const mode = id ? 'edit' : 'add';

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
          // Filter active workers only
          const activeWorkers = workerResponse.data.workers.filter(
            worker => worker.status === 'active' || worker.status === 'on-leave'
          );
          setWorkers(activeWorkers);
        }

        // Fetch debt data if in edit mode
        if (mode === 'edit' && id) {
          const debtId = parseInt(id);
          const response = await debtAPI.getById(debtId);

          if (response.status) {
            const debtData = response.data;
            setDebt(debtData);
            setFormData({
              worker_id: debtData.worker.id,
              amount: debtData.amount,
              reason: debtData.reason || '',
              dueDate: debtData.dueDate ? debtData.dueDate.split('T')[0] : '',
              interestRate: debtData.interestRate,
              paymentTerm: debtData.paymentTerm || '30',
              notes: ''
            });

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
            navigate('/finances/debts');
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
  }, [id, mode, navigate]);

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
  };

  // Handle worker selection
  const handleWorkerSelect = (workerId: number | null) => {
    handleChange('worker_id', workerId);
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
        debtData.id = parseInt(id);
        response = await debtAPI.update(debtData);
      }

      if (response?.status) {
        showSuccess(
          mode === 'add'
            ? 'Debt created successfully!'
            : 'Debt updated successfully!'
        );

        const view = await dialogs.confirm({
          title: 'Success',
          message: mode === 'add'
            ? 'Debt created successfully!'
            : 'Debt updated successfully!',
          cancelText: 'Return to List',
          confirmText: 'View Debt',
          icon: 'success'
        });

        if (view) {
          navigate(`/finances/debts/${response.data.id}`);
        } else {
          navigate('/finances/debts');
        }
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

  // Handle cancel
  const handleCancel = async () => {
    const confirm = await dialogs.confirm({
      title: 'Cancel Form',
      message: 'Are you sure you want to cancel? All changes will be lost.',
      cancelText: 'No',
      confirmText: 'Yes',
      icon: 'warning'
    });

    if (confirm) {
      navigate('/finances/debts');
    }
  };

  // Get selected worker details
  const selectedWorker = workers.find(w => w.id === formData.worker_id);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 border-blue-600" />
            <p className="text-sm text-gray-600">
              {mode === 'add' ? 'Loading form...' : 'Loading debt data...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 bg-field-pattern">
      <div className="max-w-6xl mx-auto p-4 lg:p-8">
        {/* Header Card */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={handleCancel}
                className="p-2 rounded-lg hover:bg-white transition-colors bg-white/80 border border-gray-300"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                  {mode === 'add' ? 'Create New Debt' : 'Edit Debt'}
                </h1>
                <p className="text-sm mt-1 text-gray-600">
                  {mode === 'add'
                    ? 'Record a new debt for a worker'
                    : `Editing Debt #${debt?.id || ''} - ${debt?.worker?.name || 'Worker Debt'}`}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-white/80 p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-gray-600">Worker</span>
                </div>
                <p className="text-sm font-medium mt-1 text-gray-800">
                  {selectedWorker?.name || 'Not selected'}
                </p>
              </div>
              <div className="bg-white/80 p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-gray-600">Amount</span>
                </div>
                <p className="text-sm font-medium mt-1 text-gray-800">
                  {formData.amount > 0 ? `₱${formData.amount.toLocaleString()}` : 'Not set'}
                </p>
              </div>
              <div className="bg-white/80 p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-medium text-gray-600">Interest Rate</span>
                </div>
                <p className="text-sm font-medium mt-1 text-gray-800">
                  {formData.interestRate}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-8">
              {/* Worker & Amount Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-transparent">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                    <User className="w-5 h-5 text-blue-600" />
                    Worker & Amount
                  </h2>
                  <p className="text-xs mt-1 text-gray-600">
                    Select the worker and specify the debt amount
                  </p>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Select Worker <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <WorkerSelect
                        value={formData.worker_id}
                        onChange={handleWorkerSelect}
                        placeholder="Search or select a worker..."
                        disabled={mode === 'edit'}
                      />
                      {errors.worker_id && (
                        <p className="mt-2 text-xs flex items-center gap-1 text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          {errors.worker_id}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700" htmlFor="amount">
                      Debt Amount <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <span className="text-gray-500">₱</span>
                        </div>
                        <input
                          id="amount"
                          type="number"
                          min="0.01"
                          max="1000000"
                          step="0.01"
                          value={formData.amount || ''}
                          onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                          className={`flex-1 pl-8 pr-3 py-3 rounded-lg text-sm ${
                            errors.amount ? 'border-red-500' : ''
                          }`}
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            border: `1px solid ${errors.amount ? '#ef4444' : 'var(--input-border)'}`,
                            color: 'var(--text-primary)'
                          }}
                          placeholder="0.00"
                          required
                        />
                      </div>
                      {errors.amount && (
                        <p className="mt-2 text-xs flex items-center gap-1 text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          {errors.amount}
                        </p>
                      )}
                    </div>
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
                        <h3 className="text-sm font-medium">
                          Debt Limit Check
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
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

              {/* Interest & Terms Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-transparent">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                    <Percent className="w-5 h-5 text-purple-600" />
                    Interest & Terms
                  </h2>
                  <p className="text-xs mt-1 text-gray-600">
                    Set interest rate and payment terms
                  </p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700" htmlFor="interestRate">
                        Interest Rate (%)
                      </label>
                      <div className="relative">
                        <input
                          id="interestRate"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={formData.interestRate}
                          onChange={(e) => handleChange('interestRate', parseFloat(e.target.value) || 0)}
                          className={`w-full pl-8 pr-3 py-3 rounded-lg text-sm ${
                            errors.interestRate ? 'border-red-500' : ''
                          }`}
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            border: `1px solid ${errors.interestRate ? '#ef4444' : 'var(--input-border)'}`,
                            color: 'var(--text-primary)'
                          }}
                          placeholder="0.0"
                        />
                        <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                      {errors.interestRate && (
                        <p className="mt-2 text-xs flex items-center gap-1 text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          {errors.interestRate}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700" htmlFor="paymentTerm">
                        Payment Term (days)
                      </label>
                      <select
                        id="paymentTerm"
                        value={formData.paymentTerm}
                        onChange={(e) => handleChange('paymentTerm', e.target.value)}
                        className={`w-full p-3 rounded-lg text-sm ${
                          errors.paymentTerm ? 'border-red-500' : ''
                        }`}
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          border: `1px solid ${errors.paymentTerm ? '#ef4444' : 'var(--input-border)'}`,
                          color: 'var(--text-primary)'
                        }}
                      >
                        {paymentTerms.map((term) => (
                          <option key={term.value} value={term.value}>
                            {term.label}
                          </option>
                        ))}
                      </select>
                      {errors.paymentTerm && (
                        <p className="mt-2 text-xs flex items-center gap-1 text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          {errors.paymentTerm}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Interest Rate Quick Select */}
                  <div>
                    <h3 className="text-sm font-medium mb-3 text-gray-700">
                      Common Interest Rates
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {interestRates.map((rate, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleChange('interestRate', rate.value)}
                          className={`p-3 rounded-lg text-sm text-left transition-all ${
                            formData.interestRate === rate.value
                              ? 'bg-purple-100 border-2 border-purple-600'
                              : 'bg-gray-50 border border-gray-200 hover:border-purple-400'
                          }`}
                        >
                          <div className="font-medium text-gray-800">
                            {rate.value}%
                          </div>
                          <div className="text-xs mt-1 text-gray-600">
                            {rate.label.split('(')[1].replace(')', '')}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interest Preview */}
                  {interestPreview && formData.amount > 0 && (
                    <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-blue-50 border border-gray-200">
                      <h3 className="text-sm font-medium mb-3 text-gray-700 flex items-center gap-2">
                        <Calculator className="w-4 h-4" />
                        Interest Calculation Preview
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">
                            ₱{formData.amount.toLocaleString()}
                          </div>
                          <div className="text-xs mt-1 text-gray-600">
                            Principal Amount
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-600">
                            ₱{interestPreview.interest.toLocaleString()}
                          </div>
                          <div className="text-xs mt-1 text-gray-600">
                            Total Interest
                          </div>
                        </div>
                        <div className="col-span-2 text-center pt-4 border-t border-gray-200">
                          <div className="text-2xl font-bold text-blue-600">
                            ₱{interestPreview.totalAmount.toLocaleString()}
                          </div>
                          <div className="text-xs mt-1 text-gray-600">
                            Total Amount Due
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              {/* Due Date & Reason Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-transparent">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                    <Calendar className="w-5 h-5 text-green-600" />
                    Due Date & Reason
                  </h2>
                  <p className="text-xs mt-1 text-gray-600">
                    Set payment deadline and provide reason for the debt
                  </p>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700" htmlFor="dueDate">
                      Due Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => handleChange('dueDate', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className={`w-full p-3 rounded-lg text-sm ${
                          errors.dueDate ? 'border-red-500' : ''
                        }`}
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          border: `1px solid ${errors.dueDate ? '#ef4444' : 'var(--input-border)'}`,
                          color: 'var(--text-primary)'
                        }}
                        required
                      />
                      {errors.dueDate && (
                        <p className="mt-2 text-xs flex items-center gap-1 text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          {errors.dueDate}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700" htmlFor="reason">
                      Reason for Debt <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <textarea
                        id="reason"
                        value={formData.reason}
                        onChange={(e) => handleChange('reason', e.target.value)}
                        className={`w-full p-3 rounded-lg text-sm min-h-[100px] resize-y ${
                          errors.reason ? 'border-red-500' : ''
                        }`}
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          border: `1px solid ${errors.reason ? '#ef4444' : 'var(--input-border)'}`,
                          color: 'var(--text-primary)'
                        }}
                        placeholder="Enter the reason for this debt... 
• Salary advance
• Emergency loan
• Equipment purchase
• Medical assistance
• Training fee"
                        required
                      />
                      {errors.reason && (
                        <p className="mt-2 text-xs flex items-center gap-1 text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          {errors.reason}
                        </p>
                      )}
                      <div className="mt-3 flex justify-between items-center">
                        <p className="text-xs text-gray-500">
                          Be descriptive to help track the purpose of this debt
                        </p>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          formData.reason.length > 500 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {formData.reason.length}/500
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicators */}
                  {formData.dueDate && (
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <h3 className="text-sm font-medium mb-2 text-gray-700 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        Payment Timeline
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date Created:</span>
                          <span className="font-medium">
                            {new Date().toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Due Date:</span>
                          <span className="font-medium">
                            {new Date(formData.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Days Remaining:</span>
                          <span className={`font-medium ${
                            (() => {
                              const dueDate = new Date(formData.dueDate);
                              const today = new Date();
                              const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                              return daysRemaining <= 7 ? 'text-red-600' : daysRemaining <= 14 ? 'text-yellow-600' : 'text-green-600';
                            })()
                          }`}>
                            {(() => {
                              const dueDate = new Date(formData.dueDate);
                              const today = new Date();
                              return Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            })()} days
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-transparent">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                    <FileText className="w-5 h-5 text-yellow-600" />
                    Additional Notes (Optional)
                  </h2>
                  <p className="text-xs mt-1 text-gray-600">
                    Add any additional information or special instructions
                  </p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        className={`w-full p-4 rounded-lg text-sm min-h-[180px] resize-y ${
                          errors.notes ? 'border-red-500' : ''
                        }`}
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          border: `1px solid ${errors.notes ? '#ef4444' : 'var(--input-border)'}`,
                          color: 'var(--text-primary)'
                        }}
                        placeholder="Enter any additional notes about this debt... 
• Payment schedule details
• Special conditions or agreements
• Collateral information (if any)
• Contact person for collection
• Any supporting document references"
                        rows={6}
                      />
                      {errors.notes && (
                        <p className="mt-2 text-xs flex items-center gap-1 text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          {errors.notes}
                        </p>
                      )}
                      <div className="mt-3 flex justify-between items-center">
                        <p className="text-xs text-gray-500">
                          Add detailed information for better debt management
                        </p>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          formData.notes.length > 1000 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {formData.notes.length}/1000
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-8 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <AlertCircle className="w-4 h-4" />
              <span>Fields marked with <span className="text-red-500">*</span> are required</span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 rounded-lg text-sm font-medium transition-all hover:shadow-md hover:bg-gray-50 flex items-center gap-2 bg-white text-gray-700 border border-gray-300"
                disabled={submitting}
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-lg text-sm font-medium transition-all hover:scale-105 hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
              >
                {submitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    {mode === 'add' ? 'Creating Debt...' : 'Updating Debt...'}
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
        </form>
      </div>
    </div>
  );
};

export default DebtFormPage;