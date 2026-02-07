// import React, { useState, useEffect } from 'react';
// import {
//     Save, RefreshCw, Download, Upload,
//     CheckCircle, AlertCircle, Settings,
//     Calendar, LandPlot, MapPin, UserCheck,
//     CreditCard, FileText, Shield,
//     Plus
// } from 'lucide-react';
// import type { FarmAssignmentSettings, FarmAuditSettings, FarmBukidSettings, FarmDebtSettings, FarmPaymentSettings, FarmPitakSettings, FarmSessionSettings } from '../../apis/system_config';
// import systemConfigAPI from '../../apis/system_config';
// import { showError, showSuccess } from '../../utils/notification';
// import sessionAPI, { type SessionListData } from '../../apis/session';

// const FarmManagementSettingsPage: React.FC = () => {
//     const [loading, setLoading] = useState(true);
//     const [saving, setSaving] = useState(false);
//     const [activeTab, setActiveTab] = useState('session');

//     // State for each category
//     const [sessionSettings, setSessionSettings] = useState<FarmSessionSettings>({});
//     const [bukidSettings, setBukidSettings] = useState<FarmBukidSettings>({});
//     const [pitakSettings, setPitakSettings] = useState<FarmPitakSettings>({});
//     const [assignmentSettings, setAssignmentSettings] = useState<FarmAssignmentSettings>({});
//     const [paymentSettings, setPaymentSettings] = useState<FarmPaymentSettings>({});
//     const [debtSettings, setDebtSettings] = useState<FarmDebtSettings>({});
//     const [auditSettings, setAuditSettings] = useState<FarmAuditSettings>({});

//     // Load settings on mount
//     useEffect(() => {
//         loadSettings();
//     }, []);

//     const loadSettings = async () => {
//         try {
//             setLoading(true);

//             // Load all settings from API
//             const [
//                 session,
//                 bukid,
//                 pitak,
//                 assignment,
//                 payment,
//                 debt,
//                 audit
//             ] = await Promise.all([
//                 systemConfigAPI.getFarmSessionSettings(),
//                 systemConfigAPI.getFarmBukidSettings(),
//                 systemConfigAPI.getFarmPitakSettings(),
//                 systemConfigAPI.getFarmAssignmentSettings(),
//                 systemConfigAPI.getFarmPaymentSettings(),
//                 systemConfigAPI.getFarmDebtSettings(),
//                 systemConfigAPI.getFarmAuditSettings()
//             ]);

//             setSessionSettings(session || {});
//             setBukidSettings(bukid || {});
//             setPitakSettings(pitak || {});
//             setAssignmentSettings(assignment || {});
//             setPaymentSettings(payment || {});
//             setDebtSettings(debt || {});
//             setAuditSettings(audit || {});

//         } catch (error) {
//             showError('Failed to load farm management settings');
//             console.error(error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleSave = async () => {
//         try {
//             setSaving(true);

//             // Save all settings
//             await Promise.all([
//                 systemConfigAPI.updateFarmSessionSettings(sessionSettings),
//                 systemConfigAPI.updateFarmBukidSettings(bukidSettings),
//                 systemConfigAPI.updateFarmPitakSettings(pitakSettings),
//                 systemConfigAPI.updateFarmAssignmentSettings(assignmentSettings),
//                 systemConfigAPI.updateFarmPaymentSettings(paymentSettings),
//                 systemConfigAPI.updateFarmDebtSettings(debtSettings),
//                 systemConfigAPI.updateFarmAuditSettings(auditSettings)
//             ]);

//             showSuccess('Settings saved successfully');
//         } catch (error) {
//             showError('Failed to save settings');
//             console.error(error);
//         } finally {
//             setSaving(false);
//         }
//     };

//     const handleResetToDefaults = async () => {
//         if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
//             try {
//                 await systemConfigAPI.resetToDefaults();
//                 showSuccess('Settings reset to defaults');
//                 loadSettings();
//             } catch (error) {
//                 showError('Failed to reset settings');
//             }
//         }
//     };

//     const handleExport = async () => {
//         try {
//             const jsonData = await systemConfigAPI.exportSettingsToFile();
//             const blob = new Blob([jsonData], { type: 'application/json' });
//             const url = window.URL.createObjectURL(blob);
//             const a = document.createElement('a');
//             a.href = url;
//             a.download = 'farm-settings.json';
//             a.click();
//             showSuccess('Settings exported successfully');
//         } catch (error) {
//             showError('Failed to export settings');
//         }
//     };

//     const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
//         const file = event.target.files?.[0];
//         if (!file) return;

//         if (window.confirm('Importing settings will overwrite current settings. Continue?')) {
//             try {
//                 const reader = new FileReader();
//                 reader.onload = async (e) => {
//                     const jsonData = e.target?.result as string;
//                     await systemConfigAPI.importSettingsFromFile(jsonData);
//                     showSuccess('Settings imported successfully');
//                     loadSettings();
//                 };
//                 reader.readAsText(file);
//             } catch (error) {
//                 showError('Failed to import settings');
//             }
//         }
//     };

//     // Render loading state
//     if (loading) {
//         return (
//             <div className="flex items-center justify-center h-screen">
//                 <div className="text-center">
//                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
//                     <p className="text-gray-600">Loading farm management settings...</p>
//                 </div>
//             </div>
//         );
//     }

//     // Tabs configuration according to plan
//     const tabs = [
//         { id: 'session', label: 'Session Settings', icon: Calendar, color: 'text-blue-600' },
//         { id: 'bukid', label: 'Bukid Settings', icon: LandPlot, color: 'text-green-600' },
//         { id: 'pitak', label: 'Pitak Settings', icon: MapPin, color: 'text-amber-600' },
//         { id: 'assignment', label: 'Assignment Settings', icon: UserCheck, color: 'text-purple-600' },
//         { id: 'payment', label: 'Payment Settings', icon: CreditCard, color: 'text-emerald-600' },
//         { id: 'debt', label: 'Debt Settings', icon: FileText, color: 'text-red-600' },
//         { id: 'audit', label: 'Audit Settings', icon: Shield, color: 'text-indigo-600' },
//     ];

//     return (
//         <div className="min-h-screen bg-gray-50 p-6">
//             {/* Header */}
//             <div className="mb-8">
//                 <div className="flex items-center justify-between">
//                     <div>
//                         <h1 className="text-2xl font-bold flex items-center gap-3 text-gray-800">
//                             <Settings className="w-8 h-8 text-green-600" />
//                             Farm Management Settings
//                         </h1>
//                         <p className="text-gray-600 mt-2">
//                             Configure farm operations, financial rules, and system behavior
//                         </p>
//                     </div>

//                     <div className="flex gap-3">
//                         <button
//                             onClick={handleExport}
//                             className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
//                         >
//                             <Download className="w-4 h-4" />
//                             Export
//                         </button>

//                         <label className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
//                             <Upload className="w-4 h-4" />
//                             Import
//                             <input
//                                 type="file"
//                                 accept=".json"
//                                 onChange={handleImport}
//                                 className="hidden"
//                             />
//                         </label>

//                         <button
//                             onClick={handleResetToDefaults}
//                             className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 flex items-center gap-2"
//                         >
//                             <RefreshCw className="w-4 h-4" />
//                             Reset Defaults
//                         </button>
//                     </div>
//                 </div>
//             </div>

//             {/* Main Content */}
//             <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
//                 {/* Tabs */}
//                 <div className="border-b border-gray-200">
//                     <div className="flex overflow-x-auto">
//                         {tabs.map((tab) => {
//                             const Icon = tab.icon;
//                             return (
//                                 <button
//                                     key={tab.id}
//                                     onClick={() => setActiveTab(tab.id)}
//                                     className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
//                                             ? `${tab.color} border-current`
//                                             : 'text-gray-500 border-transparent hover:text-gray-700'
//                                         }`}
//                                 >
//                                     <Icon className="w-4 h-4" />
//                                     {tab.label}
//                                 </button>
//                             );
//                         })}
//                     </div>
//                 </div>

//                 {/* Tab Content */}
//                 <div className="p-6">
//                     {activeTab === 'session' && (
//                         <SessionSettings
//                             settings={sessionSettings}
//                             onChange={setSessionSettings}
//                         />
//                     )}

//                     {activeTab === 'bukid' && (
//                         <BukidSettings
//                             settings={bukidSettings}
//                             onChange={setBukidSettings}
//                         />
//                     )}

//                     {activeTab === 'pitak' && (
//                         <PitakSettings
//                             settings={pitakSettings}
//                             onChange={setPitakSettings}
//                         />
//                     )}

//                     {activeTab === 'assignment' && (
//                         <AssignmentSettings
//                             settings={assignmentSettings}
//                             onChange={setAssignmentSettings}
//                         />
//                     )}

//                     {activeTab === 'payment' && (
//                         <PaymentSettings
//                             settings={paymentSettings}
//                             onChange={setPaymentSettings}
//                         />
//                     )}

//                     {activeTab === 'debt' && (
//                         <DebtSettings
//                             settings={debtSettings}
//                             onChange={setDebtSettings}
//                         />
//                     )}

//                     {activeTab === 'audit' && (
//                         <AuditSettings
//                             settings={auditSettings}
//                             onChange={setAuditSettings}
//                         />
//                     )}
//                 </div>
//             </div>

//             {/* Save Button */}
//             <div className="mt-6 flex justify-end">
//                 <button
//                     onClick={handleSave}
//                     disabled={saving}
//                     className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
//                 >
//                     {saving ? (
//                         <>
//                             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
//                             Saving...
//                         </>
//                     ) : (
//                         <>
//                             <Save className="w-5 h-5" />
//                             Save All Settings
//                         </>
//                     )}
//                 </button>
//             </div>
//         </div>
//     );
// };

// // 1. SESSION SETTINGS COMPONENT
// // 1. SESSION SETTINGS COMPONENT
// const SessionSettings: React.FC<{
//     settings: FarmSessionSettings;
//     onChange: (settings: FarmSessionSettings) => void;
// }> = ({ settings, onChange }) => {
//     const [sessions, setSessions] = useState<SessionListData[]>([]);
//     const [loadingSessions, setLoadingSessions] = useState(false);

//     // Load sessions from sessionAPI
//     useEffect(() => {
//         loadSessions();
//     }, []);

//     const loadSessions = async () => {
//         try {
//             setLoadingSessions(true);
//             const response = await sessionAPI.getAll({
//                 sortBy: 'startDate',
//                 sortOrder: 'DESC'
//             });

//             if (response.status && response.data) {
//                 setSessions(response.data);
//             }
//         } catch (error) {
//             console.error('Failed to load sessions:', error);
//         } finally {
//             setLoadingSessions(false);
//         }
//     };

//     const updateField = (field: keyof FarmSessionSettings, value: any) => {
//         onChange({ ...settings, [field]: value });
//     };

//     const formatSessionOption = (session: SessionListData) => {
//         const statusColors: Record<string, string> = {
//             active: 'text-green-600',
//             closed: 'text-yellow-600',
//             archived: 'text-gray-500'
//         };

//         return (
//             <div className="flex flex-col">
//                 <span className="font-medium">{session.name} ({session.year})</span>
//                 <span className={`text-xs ${statusColors[session.status] || 'text-gray-500'}`}>
//                     {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
//                     {session.startDate && ` • Started: ${new Date(session.startDate).toLocaleDateString()}`}
//                 </span>
//                 {session.endDate && (
//                     <span className="text-xs text-gray-500">
//                         Ended: {new Date(session.endDate).toLocaleDateString()}
//                     </span>
//                 )}
//             </div>
//         );
//     };

//     return (
//         <div className="space-y-6">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 {/* DEFAULT SESSION SELECTOR */}
//                 <div className="md:col-span-2">
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Default Session *
//                     </label>
//                     {loadingSessions ? (
//                         <div className="flex items-center gap-2 text-gray-500">
//                             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300"></div>
//                             Loading sessions...
//                         </div>
//                     ) : sessions.length === 0 ? (
//                         <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
//                             <p className="text-sm text-yellow-800">
//                                 No sessions found. Please create a session first.
//                             </p>
//                             <button
//                                 type="button"
//                                 onClick={() => {
//                                     // You can add navigation to create session page here
//                                     window.dispatchEvent(new CustomEvent('navigate', { detail: '/sessions/new' }));
//                                 }}
//                                 className="mt-2 text-sm text-yellow-700 underline hover:text-yellow-800"
//                             >
//                                 Create New Session
//                             </button>
//                         </div>
//                     ) : (
//                         <>
//                             <select
//                                 value={settings.default_session_id || ''}
//                                 onChange={(e) => updateField('default_session_id', e.target.value ? parseInt(e.target.value) : undefined)}
//                                 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                                 required
//                             >
//                                 <option value="">Select a session...</option>
//                                 {sessions.map((session) => (
//                                     <option key={session.id} value={session.id}>
//                                         {session.name} ({session.year}) - {session.status}
//                                     </option>
//                                 ))}
//                             </select>

//                             {/* Display selected session details */}
//                             {settings.default_session_id && (
//                                 <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
//                                     <div className="flex items-start justify-between">
//                                         <div>
//                                             <h4 className="font-medium text-blue-900">
//                                                 Selected Session Details
//                                             </h4>
//                                             {(() => {
//                                                 const selectedSession = sessions.find(s => s.id === settings.default_session_id);
//                                                 if (!selectedSession) return null;

//                                                 return (
//                                                     <div className="mt-1 space-y-1 text-sm text-blue-800">
//                                                         <p><strong>Name:</strong> {selectedSession.name}</p>
//                                                         <p><strong>Year:</strong> {selectedSession.year}</p>
//                                                         <p><strong>Season:</strong> {selectedSession.seasonType || 'Not specified'}</p>
//                                                         <p><strong>Status:</strong> {selectedSession.status}</p>
//                                                         <p><strong>Start Date:</strong> {new Date(selectedSession.startDate).toLocaleDateString()}</p>
//                                                         {selectedSession.endDate && (
//                                                             <p><strong>End Date:</strong> {new Date(selectedSession.endDate).toLocaleDateString()}</p>
//                                                         )}
//                                                         <p><strong>Bukid Count:</strong> {selectedSession.bukidCount}</p>
//                                                         <p><strong>Assignment Count:</strong> {selectedSession.assignmentCount}</p>
//                                                     </div>
//                                                 );
//                                             })()}
//                                         </div>
//                                         <button
//                                             type="button"
//                                             onClick={loadSessions}
//                                             className="text-blue-600 hover:text-blue-800"
//                                         >
//                                             <RefreshCw className="w-4 h-4" />
//                                         </button>
//                                     </div>
//                                 </div>
//                             )}
//                         </>
//                     )}
//                     <p className="text-xs text-gray-500 mt-1">
//                         Required - all farm data (Bukid, Pitak, Assignment, Payment, Debt) will be tied to this session
//                     </p>
//                 </div>

//                 {/* SESSION CREATION QUICK FORM */}
//                 <div className="md:col-span-2">
//                     <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
//                         <h4 className="font-medium text-gray-700 mb-3">Quick Create Session</h4>
//                         <button
//                             type="button"
//                             onClick={() => {
//                                 // Navigate to session creation page or open modal
//                                 window.dispatchEvent(new CustomEvent('navigate', { detail: '/sessions/create' }));
//                             }}
//                             className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
//                         >
//                             <Plus className="w-4 h-4" />
//                             Create New Session
//                         </button>
//                         <p className="text-xs text-gray-500 mt-2">
//                             Create a new session if you don't see the one you need
//                         </p>
//                     </div>
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Season Type
//                     </label>
//                     <select
//                         value={settings.season_type || 'tag-ulan'}
//                         onChange={(e) => updateField('season_type', e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     >
//                         <option value="tag-ulan">Tag-ulan</option>
//                         <option value="tag-araw">Tag-araw</option>
//                         <option value="custom">Custom</option>
//                     </select>
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Year
//                     </label>
//                     <input
//                         type="number"
//                         value={settings.year || new Date().getFullYear()}
//                         onChange={(e) => updateField('year', parseInt(e.target.value))}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Status
//                     </label>
//                     <select
//                         value={settings.status || 'active'}
//                         onChange={(e) => updateField('status', e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     >
//                         <option value="active">Active</option>
//                         <option value="closed">Closed</option>
//                         <option value="archived">Archived</option>
//                     </select>
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Start Date
//                     </label>
//                     <input
//                         type="date"
//                         value={settings.start_date || ''}
//                         onChange={(e) => updateField('start_date', e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         End Date
//                     </label>
//                     <input
//                         type="date"
//                         value={settings.end_date || ''}
//                         onChange={(e) => updateField('end_date', e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>
//             </div>

//             <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Notes
//                 </label>
//                 <textarea
//                     value={settings.notes || ''}
//                     onChange={(e) => updateField('notes', e.target.value)}
//                     rows={3}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     placeholder="Optional metadata about the session"
//                 />
//             </div>

//             <div className="space-y-3">
//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.require_default_session || true}
//                         onChange={(e) => updateField('require_default_session', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Require Default Session</span>
//                 </label>

//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.auto_close_previous || false}
//                         onChange={(e) => updateField('auto_close_previous', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Auto Close Previous Session</span>
//                     <span className="text-xs text-gray-500">
//                         (When a new session is set as default)
//                     </span>
//                 </label>

//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.allow_multiple_active_sessions || false}
//                         onChange={(e) => updateField('allow_multiple_active_sessions', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Allow Multiple Active Sessions</span>
//                 </label>
//             </div>

//             {/* Session Validation */}
//             {settings.default_session_id && (
//                 <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
//                     <div className="flex items-center gap-2 text-green-700 mb-2">
//                         <CheckCircle className="w-5 h-5" />
//                         <span className="font-semibold">Default Session Configured</span>
//                     </div>
//                     <p className="text-sm text-green-600">
//                         All new farm data (Bukid, Pitak, Assignment, Payment, Debt) will be automatically
//                         associated with the selected session.
//                     </p>
//                     <p className="text-xs text-green-500 mt-1">
//                         This setting ensures data integrity across the farm management system.
//                     </p>
//                 </div>
//             )}
//         </div>
//     );
// };

// // 2. BUKID SETTINGS COMPONENT
// const BukidSettings: React.FC<{
//     settings: FarmBukidSettings;
//     onChange: (settings: FarmBukidSettings) => void;
// }> = ({ settings, onChange }) => {
//     const updateField = (field: keyof FarmBukidSettings, value: any) => {
//         onChange({ ...settings, [field]: value });
//     };

//     return (
//         <div className="space-y-6">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Name Format
//                     </label>
//                     <input
//                         type="text"
//                         value={settings.name_format || ''}
//                         onChange={(e) => updateField('name_format', e.target.value)}
//                         placeholder="e.g., Bukid {number}"
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                     <p className="text-xs text-gray-500 mt-1">Use {'{number}'} for auto-increment, {'{year}'} for year</p>
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Default Status
//                     </label>
//                     <select
//                         value={settings.default_status || 'active'}
//                         onChange={(e) => updateField('default_status', e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     >
//                         <option value="active">Active</option>
//                         <option value="inactive">Inactive</option>
//                     </select>
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Area Unit
//                     </label>
//                     <select
//                         value={settings.area_unit || 'hectares'}
//                         onChange={(e) => updateField('area_unit', e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     >
//                         <option value="hectares">Hectares</option>
//                         <option value="acres">Acres</option>
//                         <option value="square_meters">Square Meters</option>
//                     </select>
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Max Bukid per Session
//                     </label>
//                     <input
//                         type="number"
//                         value={settings.max_bukid_per_session || 0}
//                         onChange={(e) => updateField('max_bukid_per_session', parseInt(e.target.value) || 0)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                     <p className="text-xs text-gray-500 mt-1">0 for unlimited</p>
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Code Prefix
//                     </label>
//                     <input
//                         type="text"
//                         value={settings.code_prefix || ''}
//                         onChange={(e) => updateField('code_prefix', e.target.value)}
//                         placeholder="e.g., BKD"
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>
//             </div>

//             <div className="space-y-3">
//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.enable_location_descriptor || false}
//                         onChange={(e) => updateField('enable_location_descriptor', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Enable Location Descriptor</span>
//                 </label>

//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.auto_duplicate_per_session || false}
//                         onChange={(e) => updateField('auto_duplicate_per_session', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Auto Duplicate per Session</span>
//                 </label>

//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.location_required || false}
//                         onChange={(e) => updateField('location_required', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Location Required</span>
//                 </label>

//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.auto_generate_code || false}
//                         onChange={(e) => updateField('auto_generate_code', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Auto Generate Code</span>
//                 </label>
//             </div>
//         </div>
//     );
// };

// // 3. PITAK SETTINGS COMPONENT
// const PitakSettings: React.FC<{
//     settings: FarmPitakSettings;
//     onChange: (settings: FarmPitakSettings) => void;
// }> = ({ settings, onChange }) => {
//     const updateField = (field: keyof FarmPitakSettings, value: any) => {
//         onChange({ ...settings, [field]: value });
//     };

//     return (
//         <div className="space-y-6">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Default Total Luwang Capacity
//                     </label>
//                     <input
//                         type="number"
//                         value={settings.default_total_luwang_capacity || 0}
//                         onChange={(e) => updateField('default_total_luwang_capacity', parseInt(e.target.value) || 0)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Location Format
//                     </label>
//                     <input
//                         type="text"
//                         value={settings.location_format || ''}
//                         onChange={(e) => updateField('location_format', e.target.value)}
//                         placeholder="e.g., Section {letter}, Row {number}"
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Min Capacity
//                     </label>
//                     <input
//                         type="number"
//                         value={settings.min_capacity || 0}
//                         onChange={(e) => updateField('min_capacity', parseInt(e.target.value) || 0)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Max Capacity
//                     </label>
//                     <input
//                         type="number"
//                         value={settings.max_capacity || 0}
//                         onChange={(e) => updateField('max_capacity', parseInt(e.target.value) || 0)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         ID Prefix
//                     </label>
//                     <input
//                         type="text"
//                         value={settings.id_prefix || ''}
//                         onChange={(e) => updateField('id_prefix', e.target.value)}
//                         placeholder="e.g., PTK"
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Pitak Number Format
//                     </label>
//                     <input
//                         type="text"
//                         value={settings.pitak_number_format || ''}
//                         onChange={(e) => updateField('pitak_number_format', e.target.value)}
//                         placeholder="e.g., {bukid_code}-{number}"
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>
//             </div>

//             <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Status Options
//                 </label>
//                 <div className="flex flex-wrap gap-2">
//                     {['active', 'inactive', 'completed'].map((status) => (
//                         <label key={status} className="flex items-center gap-1">
//                             <input
//                                 type="checkbox"
//                                 checked={(settings.status_options || []).includes(status)}
//                                 onChange={(e) => {
//                                     const options = settings.status_options || [];
//                                     const updated = e.target.checked
//                                         ? [...options, status]
//                                         : options.filter(s => s !== status);
//                                     updateField('status_options', updated);
//                                 }}
//                                 className="rounded border-gray-300"
//                             />
//                             <span className="text-sm text-gray-700 capitalize">{status}</span>
//                         </label>
//                     ))}
//                 </div>
//             </div>

//             <div className="space-y-3">
//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.auto_generate_pitak_ids || false}
//                         onChange={(e) => updateField('auto_generate_pitak_ids', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Auto Generate Pitak IDs</span>
//                 </label>

//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.require_location || false}
//                         onChange={(e) => updateField('require_location', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Require Location</span>
//                 </label>
//             </div>
//         </div>
//     );
// };

// // 4. ASSIGNMENT SETTINGS COMPONENT
// const AssignmentSettings: React.FC<{
//     settings: FarmAssignmentSettings;
//     onChange: (settings: FarmAssignmentSettings) => void;
// }> = ({ settings, onChange }) => {
//     const updateField = (field: keyof FarmAssignmentSettings, value: any) => {
//         onChange({ ...settings, [field]: value });
//     };

//     return (
//         <div className="space-y-6">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Default Luwang per Worker
//                     </label>
//                     <input
//                         type="number"
//                         value={settings.default_luwang_per_worker || 0}
//                         onChange={(e) => updateField('default_luwang_per_worker', parseInt(e.target.value) || 0)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Date Behavior
//                     </label>
//                     <select
//                         value={settings.date_behavior || 'system_date'}
//                         onChange={(e) => updateField('date_behavior', e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     >
//                         <option value="system_date">System Date</option>
//                         <option value="manual_entry">Manual Entry</option>
//                     </select>
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Assignment Duration (Days)
//                     </label>
//                     <input
//                         type="number"
//                         value={settings.assignment_duration_days || 0}
//                         onChange={(e) => updateField('assignment_duration_days', parseInt(e.target.value) || 0)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Max Workers per Pitak
//                     </label>
//                     <input
//                         type="number"
//                         value={settings.max_workers_per_pitak || 0}
//                         onChange={(e) => updateField('max_workers_per_pitak', parseInt(e.target.value) || 0)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>
//             </div>

//             <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Status Options
//                 </label>
//                 <div className="flex flex-wrap gap-2">
//                     {['active', 'completed', 'cancelled'].map((status) => (
//                         <label key={status} className="flex items-center gap-1">
//                             <input
//                                 type="checkbox"
//                                 checked={(settings.status_options || []).includes(status)}
//                                 onChange={(e) => {
//                                     const options = settings.status_options || [];
//                                     const updated = e.target.checked
//                                         ? [...options, status]
//                                         : options.filter(s => s !== status);
//                                     updateField('status_options', updated);
//                                 }}
//                                 className="rounded border-gray-300"
//                             />
//                             <span className="text-sm text-gray-700 capitalize">{status}</span>
//                         </label>
//                     ))}
//                 </div>
//             </div>

//             <div className="space-y-3">
//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.enable_notes_remarks || false}
//                         onChange={(e) => updateField('enable_notes_remarks', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Enable Notes/Remarks</span>
//                 </label>

//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.auto_assign_bukid || false}
//                         onChange={(e) => updateField('auto_assign_bukid', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Auto Assign to Bukid</span>
//                 </label>

//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.allow_reassignment || false}
//                         onChange={(e) => updateField('allow_reassignment', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Allow Reassignment</span>
//                 </label>

//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.require_assignment_date || false}
//                         onChange={(e) => updateField('require_assignment_date', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Require Assignment Date</span>
//                 </label>
//             </div>
//         </div>
//     );
// };

// // 5. PAYMENT SETTINGS COMPONENT
// const PaymentSettings: React.FC<{
//     settings: FarmPaymentSettings;
//     onChange: (settings: FarmPaymentSettings) => void;
// }> = ({ settings, onChange }) => {
//     const updateField = (field: keyof FarmPaymentSettings, value: any) => {
//         onChange({ ...settings, [field]: value });
//     };

//     return (
//         <div className="space-y-6">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Default Wage Multiplier
//                     </label>
//                     <input
//                         type="number"
//                         step="0.01"
//                         value={settings.default_wage_multiplier || 1.0}
//                         onChange={(e) => updateField('default_wage_multiplier', parseFloat(e.target.value) || 1.0)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Deduction Rules
//                     </label>
//                     <select
//                         value={settings.deduction_rules || 'manual'}
//                         onChange={(e) => updateField('deduction_rules', e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     >
//                         <option value="manual">Manual Deduction</option>
//                         <option value="auto_debt_deduction">Auto Debt Deduction</option>
//                     </select>
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Payment Terms (Days)
//                     </label>
//                     <input
//                         type="number"
//                         value={settings.payment_terms_days || 0}
//                         onChange={(e) => updateField('payment_terms_days', parseInt(e.target.value) || 0)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Tax Percentage (%)
//                     </label>
//                     <input
//                         type="number"
//                         step="0.1"
//                         value={settings.tax_percentage || 0}
//                         onChange={(e) => updateField('tax_percentage', parseFloat(e.target.value) || 0)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>
//             </div>

//             <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Other Deductions Config (JSON)
//                 </label>
//                 <textarea
//                     value={settings.other_deductions_config || ''}
//                     onChange={(e) => updateField('other_deductions_config', e.target.value)}
//                     rows={3}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
//                     placeholder='{"insurance": 0.5, "equipment": 1.0}'
//                 />
//                 <p className="text-xs text-gray-500 mt-1">JSON format for breakdown of other deductions</p>
//             </div>

//             <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Payment Methods
//                 </label>
//                 <div className="flex flex-wrap gap-2">
//                     {['cash', 'gcash', 'bank', 'check'].map((method) => (
//                         <label key={method} className="flex items-center gap-1">
//                             <input
//                                 type="checkbox"
//                                 checked={(settings.payment_methods || []).includes(method)}
//                                 onChange={(e) => {
//                                     const methods = settings.payment_methods || [];
//                                     const updated = e.target.checked
//                                         ? [...methods, method]
//                                         : methods.filter(m => m !== method);
//                                     updateField('payment_methods', updated);
//                                 }}
//                                 className="rounded border-gray-300"
//                             />
//                             <span className="text-sm text-gray-700 capitalize">{method}</span>
//                         </label>
//                     ))}
//                 </div>
//             </div>

//             <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Status Options
//                 </label>
//                 <div className="flex flex-wrap gap-2">
//                     {['pending', 'processing', 'completed', 'cancelled', 'partially_paid'].map((status) => (
//                         <label key={status} className="flex items-center gap-1">
//                             <input
//                                 type="checkbox"
//                                 checked={(settings.status_options || []).includes(status)}
//                                 onChange={(e) => {
//                                     const options = settings.status_options || [];
//                                     const updated = e.target.checked
//                                         ? [...options, status]
//                                         : options.filter(s => s !== status);
//                                     updateField('status_options', updated);
//                                 }}
//                                 className="rounded border-gray-300"
//                             />
//                             <span className="text-sm text-gray-700 capitalize">{status.replace('_', ' ')}</span>
//                         </label>
//                     ))}
//                 </div>
//             </div>

//             <div className="space-y-3">
//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.require_reference_number || false}
//                         onChange={(e) => updateField('require_reference_number', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Require Reference Number</span>
//                 </label>

//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.auto_calculate_total || false}
//                         onChange={(e) => updateField('auto_calculate_total', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Auto Calculate Total</span>
//                 </label>

//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.require_payment_date || false}
//                         onChange={(e) => updateField('require_payment_date', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Require Payment Date</span>
//                 </label>
//             </div>
//         </div>
//     );
// };

// // 6. DEBT SETTINGS COMPONENT
// const DebtSettings: React.FC<{
//     settings: FarmDebtSettings;
//     onChange: (settings: FarmDebtSettings) => void;
// }> = ({ settings, onChange }) => {
//     const updateField = (field: keyof FarmDebtSettings, value: any) => {
//         onChange({ ...settings, [field]: value });
//     };

//     return (
//         <div className="space-y-6">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Default Interest Rate (%)
//                     </label>
//                     <input
//                         type="number"
//                         step="0.1"
//                         value={settings.default_interest_rate || 0}
//                         onChange={(e) => updateField('default_interest_rate', parseFloat(e.target.value) || 0)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Payment Term (Days)
//                     </label>
//                     <input
//                         type="number"
//                         value={settings.payment_term_days || 0}
//                         onChange={(e) => updateField('payment_term_days', parseInt(e.target.value) || 0)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Grace Period (Days)
//                     </label>
//                     <input
//                         type="number"
//                         value={settings.grace_period_days || 0}
//                         onChange={(e) => updateField('grace_period_days', parseInt(e.target.value) || 0)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Max Debt Amount
//                     </label>
//                     <input
//                         type="number"
//                         value={settings.max_debt_amount || 0}
//                         onChange={(e) => updateField('max_debt_amount', parseFloat(e.target.value) || 0)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>

//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Interest Calculation Method
//                     </label>
//                     <select
//                         value={settings.interest_calculation_method || 'simple'}
//                         onChange={(e) => updateField('interest_calculation_method', e.target.value)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     >
//                         <option value="simple">Simple Interest</option>
//                         <option value="compound">Compound Interest</option>
//                     </select>
//                 </div>

//                 {settings.interest_calculation_method === 'compound' && (
//                     <div>
//                         <label className="block text-sm font-medium text-gray-700 mb-2">
//                             Compound Frequency
//                         </label>
//                         <select
//                             value={settings.compound_frequency || 'monthly'}
//                             onChange={(e) => updateField('compound_frequency', e.target.value)}
//                             className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                         >
//                             <option value="daily">Daily</option>
//                             <option value="weekly">Weekly</option>
//                             <option value="monthly">Monthly</option>
//                         </select>
//                     </div>
//                 )}
//             </div>

//             <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Status Options
//                 </label>
//                 <div className="flex flex-wrap gap-2">
//                     {['pending', 'partially_paid', 'paid', 'cancelled', 'overdue'].map((status) => (
//                         <label key={status} className="flex items-center gap-1">
//                             <input
//                                 type="checkbox"
//                                 checked={(settings.status_options || []).includes(status)}
//                                 onChange={(e) => {
//                                     const options = settings.status_options || [];
//                                     const updated = e.target.checked
//                                         ? [...options, status]
//                                         : options.filter(s => s !== status);
//                                     updateField('status_options', updated);
//                                 }}
//                                 className="rounded border-gray-300"
//                             />
//                             <span className="text-sm text-gray-700 capitalize">{status.replace('_', ' ')}</span>
//                         </label>
//                     ))}
//                 </div>
//             </div>

//             <div className="space-y-3">
//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.carry_over_to_next_session || false}
//                         onChange={(e) => updateField('carry_over_to_next_session', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Carry Over to Next Session</span>
//                 </label>

//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.require_debt_reason || false}
//                         onChange={(e) => updateField('require_debt_reason', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Require Debt Reason</span>
//                 </label>

//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.auto_apply_interest || false}
//                         onChange={(e) => updateField('auto_apply_interest', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Auto Apply Interest</span>
//                 </label>
//             </div>
//         </div>
//     );
// };

// // 7. AUDIT SETTINGS COMPONENT
// const AuditSettings: React.FC<{
//     settings: FarmAuditSettings;
//     onChange: (settings: FarmAuditSettings) => void;
// }> = ({ settings, onChange }) => {
//     const updateField = (field: keyof FarmAuditSettings, value: any) => {
//         onChange({ ...settings, [field]: value });
//     };

//     return (
//         <div className="space-y-6">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Audit Retention (Days)
//                     </label>
//                     <input
//                         type="number"
//                         value={settings.audit_retention_days || 365}
//                         onChange={(e) => updateField('audit_retention_days', parseInt(e.target.value) || 365)}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-lg"
//                     />
//                 </div>
//             </div>

//             <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Log Events
//                 </label>
//                 <div className="flex flex-wrap gap-2">
//                     {['create', 'update', 'delete', 'view', 'export'].map((event) => (
//                         <label key={event} className="flex items-center gap-1">
//                             <input
//                                 type="checkbox"
//                                 checked={(settings.log_events || []).includes(event)}
//                                 onChange={(e) => {
//                                     const events = settings.log_events || [];
//                                     const updated = e.target.checked
//                                         ? [...events, event]
//                                         : events.filter(ev => ev !== event);
//                                     updateField('log_events', updated);
//                                 }}
//                                 className="rounded border-gray-300"
//                             />
//                             <span className="text-sm text-gray-700 capitalize">{event}</span>
//                         </label>
//                     ))}
//                 </div>
//             </div>

//             {settings.notify_on_critical_events && (
//                 <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Critical Events
//                     </label>
//                     <div className="flex flex-wrap gap-2">
//                         {['data_deletion', 'payment_override', 'debt_write_off', 'user_permission_change'].map((event) => (
//                             <label key={event} className="flex items-center gap-1">
//                                 <input
//                                     type="checkbox"
//                                     checked={(settings.critical_events || []).includes(event)}
//                                     onChange={(e) => {
//                                         const events = settings.critical_events || [];
//                                         const updated = e.target.checked
//                                             ? [...events, event]
//                                             : events.filter(ev => ev !== event);
//                                         updateField('critical_events', updated);
//                                     }}
//                                     className="rounded border-gray-300"
//                                 />
//                                 <span className="text-sm text-gray-700 capitalize">{event.replace('_', ' ')}</span>
//                             </label>
//                         ))}
//                     </div>
//                 </div>
//             )}

//             <div className="space-y-3">
//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.log_actions_enabled !== false}
//                         onChange={(e) => updateField('log_actions_enabled', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Log Actions Enabled</span>
//                 </label>

//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.track_entity_id !== false}
//                         onChange={(e) => updateField('track_entity_id', e.target.checked)}
//                         className="rounded border-gray-300"
//                         disabled
//                     />
//                     <span className="text-sm text-gray-700">Track Entity + Entity ID (Always On)</span>
//                 </label>

//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.capture_ip_address || false}
//                         onChange={(e) => updateField('capture_ip_address', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Capture IP Address</span>
//                 </label>

//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.capture_user_agent || false}
//                         onChange={(e) => updateField('capture_user_agent', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Capture User Agent</span>
//                 </label>

//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.tie_to_session !== false}
//                         onChange={(e) => updateField('tie_to_session', e.target.checked)}
//                         className="rounded border-gray-300"
//                         disabled
//                     />
//                     <span className="text-sm text-gray-700">Tie to Session (Always On for Audit Clarity)</span>
//                 </label>

//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.enable_real_time_logging || false}
//                         onChange={(e) => updateField('enable_real_time_logging', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Enable Real-time Logging</span>
//                 </label>

//                 <label className="flex items-center gap-2">
//                     <input
//                         type="checkbox"
//                         checked={settings.notify_on_critical_events || false}
//                         onChange={(e) => updateField('notify_on_critical_events', e.target.checked)}
//                         className="rounded border-gray-300"
//                     />
//                     <span className="text-sm text-gray-700">Notify on Critical Events</span>
//                 </label>
//             </div>
//         </div>
//     );
// };

// export default FarmManagementSettingsPage;