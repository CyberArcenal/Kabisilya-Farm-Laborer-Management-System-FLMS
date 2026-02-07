import { Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from '../components/Shared/PageNotFound';
import userAPI from '../apis/user';
import ProtectedRoute from '../app/ProtectedRoute';
import { useEffect, useState } from 'react';
import Layout from '../layouts/Layout';
import KabisilyaFirstRunSetup from '../pages/Setup';
import Login from '../pages/Auth/Login';
// import BukidTablePage from '../pages/Bukid/Table';
// import AssignmentTablePage from '../pages/Assignment/Table';
// import KabisilyaTablePage from '../pages/Kabisilya/Table';
// import WorkerTablePage from '../pages/Worker/Table/WorkerTable';
import WorkerAttendancePage from '../pages/WorkerAttendance';
// import PaymentTablePage from '../pages/Payment/Table/PaymentTable';
// import DebtTablePage from '../pages/Debt/Table/DebtTable';
// import UserTablePage from '../pages/User/Table';
// import AuditTrailTablePage from '../pages/Audit/AuditTrail';
import BukidReportsPage from '../pages/Analytics/Bukid';
import PitakProductivityPage from '../pages/Analytics/PitakProductivity';
import FinancialReportsPage from '../pages/Analytics/FinancialReports';
import WorkerPerformancePage from '../pages/Analytics/WorkerPerformance';
import BukidFormPage from '../pages/Bukid/Form';
// import KabisilyaFormPage from '../pages/Kabisilya/Form';
import PitakFormPage from '../pages/Pitak/Form';
import WorkerFormPage from '../pages/Worker/Form/WorkerForm';
import DebtFormPage from '../pages/Debt/Form/DebtForm';
import PitakTablePage from '../pages/Pitak/Table';
import BukidTablePage from '../pages/Bukid/Table/BukidTablePage';
import AssignmentTablePage from '../pages/Assignment/Table/AssignmentTablePage';
// import KabisilyaTablePage from '../pages/Kabisilya/Table/KabisilyaTablePage';
import WorkerTablePage from '../pages/Worker/Table/WorkerTablePage';
import PaymentTablePage from '../pages/Payment/Table/PaymentTablePage';
import DebtTablePage from '../pages/Debt/Table/DebtTablePage';
import UserTablePage from '../pages/User/Table/UserTablePage';
import AuditTrailTablePage from '../pages/Audit/AuditTrailTablePage';
import SessionTablePage from '../pages/Session/SessionTablePage';
import FarmManagementSettingsPage from '../pages/Settings';
import HistoryPage from '../pages/History';
import MyProfileView from '../pages/User/Table/Dialogs/MyProfile/View';
import DashboardPage from '../pages/dashboard/DashboardPage';

// import FarmManagementSettingsPage from '../pages/Settings/FarmManagementSettingsPage';

// 🔹 Placeholder components para hindi mag red mark
const Placeholder = ({ title }: { title: string }) => (
  <div style={{ padding: '2rem' }}>
    <h1>{title}</h1>
    <p>Placeholder page for {title}</p>
  </div>
);

function App() {
  const [setupRequired, setSetupRequired] = useState<boolean | null>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    try {
      const response = await userAPI.getAllUsers();
      const hasUsers = response.data && response.data.users.length > 0;
      setSetupRequired(!hasUsers);
    } catch (error) {
      console.error('Error checking setup:', error);
      setSetupRequired(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background-color)'
      }}>
        <div className="text-center">
          <div style={{
            animation: 'spin 1s linear infinite',
            borderRadius: '50%',
            width: '3rem',
            height: '3rem',
            border: '3px solid transparent',
            borderTop: '3px solid var(--primary-color)',
            margin: '0 auto 1rem auto'
          }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {setupRequired && (
        <Route path="*" element={<KabisilyaFirstRunSetup />} />
      )}

      {!setupRequired && (
        <>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Dashboard */}
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Bukid & Pitak */}
            <Route path="/farms/bukid" element={<BukidTablePage />} />
            <Route path="/bukid/create" element={<BukidFormPage />} />
            <Route path="/bukid/edit/:id" element={<BukidFormPage />} />

            <Route path="/farms/pitak" element={<PitakTablePage />} />
            <Route path="/farms/pitak/form" element={<PitakFormPage />} />
            <Route path="/farms/pitak/form/:id" element={<PitakFormPage />} />

            <Route path="/farms/assignments" element={<AssignmentTablePage />} />
            <Route path="/farms/assignments/form" element={<Placeholder title="Assignment Form" />} />
            <Route path="/farms/assignments/form/:id" element={<Placeholder title="Assignment Form" />} />
            {/* Kabisilya & Workers */}
            {/* <Route path="/workers/kabisilya" element={<KabisilyaTablePage />} />
            <Route path="/workers/kabisilya/form" element={<KabisilyaFormPage />} />
            <Route path="/workers/kabisilya/form/:id" element={<KabisilyaFormPage />} /> */}

            <Route path="/workers/list" element={<WorkerTablePage />} />
            <Route path="/workers" element={<WorkerTablePage />} />
            <Route path="/workers/form" element={<WorkerFormPage />} />
            <Route path="/workers/form/:id" element={<WorkerFormPage />} />
            <Route path="/workers/attendance" element={<WorkerAttendancePage />} />

            {/* Payroll & Finance */}
            <Route path="/finance/payments" element={<PaymentTablePage />} />
            <Route path="/finance/debts" element={<DebtTablePage />} />
            <Route path="/finance/debts/form" element={<DebtFormPage />} />
            <Route path="/finance/debts/form/:id" element={<DebtFormPage />} />
            <Route path='/finance/history' element={<HistoryPage/>}/>

            {/* Reports & Analytics */}
            <Route path="/analytics/bukid" element={<BukidReportsPage />} />
            <Route path="/analytics/pitak" element={<PitakProductivityPage />} />
            <Route path="/analytics/finance" element={<FinancialReportsPage />} />
            <Route path="/analytics/workers" element={<WorkerPerformancePage />} />

            {/* System */}
            <Route path="/system/users" element={<UserTablePage />} />
            <Route path="/system/users/form" element={<Placeholder title="User Form" />} />
            <Route path="/system/users/form/:id" element={<Placeholder title="User Form" />} />
            <Route path="/system/audit" element={<AuditTrailTablePage />} />
            <Route path="/system/notifications" element={<Placeholder title="Notifications" />} />
            <Route path="/system/backup" element={<Placeholder title="Backup & Restore" />} />

            <Route path="/system/sessions" element={<SessionTablePage/>} />
            <Route path="/system/settings" element={<FarmManagementSettingsPage />} />
            <Route path='/system/profile' element={<MyProfileView/>}/>

            {/* Default redirect */}
            <Route path="/" element={
              setupRequired ? <Navigate to="/setup" replace /> : <Navigate to="/login" replace />
            } />

            {/* 404 */}
            <Route path="*" element={<PageNotFound />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      )}
    </Routes>
  );
}

export default App;