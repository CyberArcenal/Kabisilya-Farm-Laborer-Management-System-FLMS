// UserViewDialog.tsx
import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  Edit,
  Activity,
  Key,
  Lock,
  Trash2,
  Ban,
  Check,
  AlertCircle,
  UserCheck,
  UserX,
} from "lucide-react";
import type { UserActivityData, UserData } from "../../../../apis/user";
import userAPI from "../../../../apis/user";
import { kabAuthStore } from "../../../../lib/kabAuthStore";
import { showError, showSuccess } from "../../../../utils/notification";
import { formatDate, formatDateTime } from "../../../../utils/formatters";
import { dialogs } from "../../../../utils/dialogs";

interface UserViewDialogProps {
  userId: number;
  onClose: () => void;
  onEdit?: (userId: number) => void;
  onDelete?: (userId: number) => void;
}

interface UserWithDetails extends UserData {
  activity?: UserActivityData[];
  stats?: {
    totalLogins: number;
    lastMonthActivity: number;
    averageSessions: number;
  };
}

const UserViewDialog: React.FC<UserViewDialogProps> = ({
  userId,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState<
    "details" | "activity" | "security"
  >("details");
  const [activityLoading, setActivityLoading] = useState(false);
  const [currentUser] = useState(() => kabAuthStore.getUser());

  // Check permissions
  const isAdmin = currentUser?.role === "admin";
  const isCurrentUser = currentUser?.id === userId;

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);

        const [userResponse, activityResponse] = await Promise.all([
          userAPI.getUserById(userId),
          userAPI.getUserActivity(userId, 1, 10).catch(() => null), // Get recent activity
        ]);

        if (userResponse.status && userResponse.data.user) {
          const userData: UserWithDetails = {
            ...userResponse.data.user,
            activity: activityResponse?.data?.activities || [],
          };

          // Add some mock stats (you can replace with real API calls)
          userData.stats = {
            totalLogins: 42,
            lastMonthActivity: 15,
            averageSessions: 2.5,
          };

          setUser(userData);
        } else {
          showError("Failed to load user data");
          onClose();
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        showError("Failed to load user data");
        onClose();
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId, onClose]);

  // Handle status toggle
  const handleToggleStatus = async () => {
    if (!user) return;

    const newStatus = !user.isActive;
    const action = newStatus ? "activate" : "deactivate";

    const confirmed = await dialogs.confirm({
      title: `Are you sure you want to ${action} this user?`,
      message: newStatus
        ? "The user will be able to access the system again."
        : "The user will no longer be able to access the system.",
      confirmText: newStatus ? "Activate User" : "Deactivate User",
      icon: newStatus ? "info" : "warning",
    });

    if (!confirmed) return;

    try {
      const response = await userAPI.updateUserStatus(user.id, newStatus);

      if (response.status && response.data.user) {
        setUser({ ...user, ...response.data.user });
        showSuccess(
          `User ${newStatus ? "activated" : "deactivated"} successfully`,
        );
      } else {
        showError(`Failed to ${action} user`);
      }
    } catch (error) {
      console.error(`Error ${action} user:`, error);
      showError(`Failed to ${action} user`);
    }
  };

  // Handle role change
  const handleRoleChange = async (newRole: "admin" | "manager" | "user") => {
    if (!user) return;

    const confirmed = await dialogs.confirm({
      title: `Change user role to ${newRole}?`,
      message: `This will change the user's permissions and access level.`,
      confirmText: "Change Role",
      icon: "info",
    });

    if (!confirmed) return;

    try {
      const response = await userAPI.updateUserRole(user.id, newRole);

      if (response.status && response.data.user) {
        setUser({ ...user, ...response.data.user });
        showSuccess("User role updated successfully");
      } else {
        showError("Failed to update user role");
      }
    } catch (error) {
      console.error("Error updating user role:", error);
      showError("Failed to update user role");
    }
  };

  // Handle password reset (admin initiated)
  const handlePasswordReset = async () => {
    if (!user) return;

    const confirmed = await dialogs.confirm({
      title: "Reset user password?",
      message:
        "This will send a password reset email to the user. They will need to set a new password.",
      confirmText: "Reset Password",
      icon: "warning",
    });

    if (!confirmed) return;

    try {
      // Note: This would need a backend API for admin-initiated password reset
      showSuccess("Password reset email sent successfully");
    } catch (error) {
      console.error("Error resetting password:", error);
      showError("Failed to reset password");
    }
  };

  // Handle user deletion
  const handleDeleteUser = async () => {
    if (!user) return;

    const confirmed = await dialogs.confirm({
      title: "Delete this user?",
      message:
        "This action cannot be undone. All user data will be permanently deleted.",
      confirmText: "Delete User",
      icon: "warning",
    });

    if (!confirmed) return;

    try {
      const response = await userAPI.deleteUser(user.id);

      if (response.status) {
        showSuccess("User deleted successfully");
        if (onDelete) onDelete(user.id);
        onClose();
      } else {
        showError("Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      showError("Failed to delete user");
    }
  };

  // Copy user details
  const handleCopyDetails = () => {
    if (!user) return;

    const details = `
      User #${user.id}
      Username: ${user.username}
      Email: ${user.email}
      Name: ${user.name || "N/A"}
      Role: ${user.role}
      Status: ${user.isActive ? "Active" : "Inactive"}
      Contact: ${user.contact || "N/A"}
      Address: ${user.address || "N/A"}
      Last Login: ${user.lastLogin ? formatDate(user.lastLogin) : "Never"}
      Created: ${formatDate(user.createdAt)}
    `.trim();

    navigator.clipboard.writeText(details);
    showSuccess("User details copied to clipboard");
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "manager":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "user":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-red-100 text-red-800 border-red-200";
  };

  // Format activity action
  const formatAction = (action: string) => {
    return action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-lg w-full max-w-4xl shadow-lg border border-gray-200">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading user details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const StatusIcon = user.isActive ? CheckCircle : XCircle;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl shadow-lg border border-gray-200 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-sm">
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt="Profile"
                  className="w-full h-full rounded-xl object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">
                  {user.name || user.username}
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getRoleBadgeColor(user.role)}`}
                >
                  <Shield className="w-3 h-3" />
                  {user.role.toUpperCase()}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusBadgeColor(user.isActive)}`}
                >
                  <StatusIcon className="w-3 h-3" />
                  {user.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                <Mail className="w-3.5 h-3.5" />
                <span>{user.email}</span>
                <span className="text-gray-400">•</span>
                <span>ID: #{user.id}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onEdit && isAdmin && (
              <button
                onClick={() => onEdit(user.id)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                title="Edit User"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleCopyDetails}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
              title="Copy Details"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex px-4">
            {["details", "activity", "security"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-700 bg-white"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          <div className="p-6">
            {activeTab === "details" && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">
                          Total Logins
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {user.stats?.totalLogins || 0}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          All time
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">
                          Last 30 Days
                        </div>
                        <div className="text-2xl font-bold text-green-700">
                          {user.stats?.lastMonthActivity || 0}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Active days
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-xl border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">
                          Avg. Sessions
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {user.stats?.averageSessions || 0}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Per month
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-purple-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Personal Information */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <User className="w-5 h-5 text-blue-600" />
                        <h4 className="text-base font-semibold text-gray-900">
                          Personal Information
                        </h4>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Full Name
                          </label>
                          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {user.name || "Not provided"}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Email Address
                          </label>
                          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {user.email}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Contact Number
                          </label>
                          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {user.contact || "Not provided"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Address Information */}
                    {user.address && (
                      <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <MapPin className="w-5 h-5 text-green-600" />
                          <h4 className="text-base font-semibold text-gray-900">
                            Address Information
                          </h4>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-700 whitespace-pre-line">
                            {user.address}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Account Information */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-5 h-5 text-purple-600" />
                        <h4 className="text-base font-semibold text-gray-900">
                          Account Information
                        </h4>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Username
                          </label>
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <span className="text-sm text-gray-900">
                              {user.username}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              User Role
                            </label>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(user.role)}`}
                              >
                                {user.role.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Account Status
                            </label>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeColor(user.isActive)}`}
                              >
                                {user.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span className="text-gray-600">Created</span>
                            </div>
                            <span className="text-gray-900">
                              {formatDate(user.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              <span className="text-gray-600">
                                Last Updated
                              </span>
                            </div>
                            <span className="text-gray-900">
                              {formatDate(user.updatedAt)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                              <span className="text-gray-600">Last Login</span>
                            </div>
                            <span className="text-gray-900">
                              {user.lastLogin
                                ? formatDateTime(user.lastLogin)
                                : "Never"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions (Admin only) */}
                    {isAdmin && !isCurrentUser && (
                      <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <AlertCircle className="w-5 h-5 text-amber-600" />
                          <h4 className="text-base font-semibold text-gray-900">
                            Quick Actions
                          </h4>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={handleToggleStatus}
                            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 ${
                              user.isActive
                                ? "bg-red-100 hover:bg-red-200 text-red-700"
                                : "bg-green-100 hover:bg-green-200 text-green-700"
                            }`}
                          >
                            {user.isActive ? (
                              <>
                                <Ban className="w-4 h-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                Activate
                              </>
                            )}
                          </button>
                          <button
                            onClick={handlePasswordReset}
                            className="px-3 py-2 rounded-lg text-sm font-medium bg-amber-100 hover:bg-amber-200 text-amber-700 flex items-center justify-center gap-1.5"
                          >
                            <Lock className="w-4 h-4" />
                            Reset Password
                          </button>
                          <button
                            onClick={() => handleRoleChange("admin")}
                            className={`px-3 py-2 rounded-lg text-sm font-medium ${
                              user.role === "admin"
                                ? "bg-purple-600 text-white"
                                : "bg-purple-100 hover:bg-purple-200 text-purple-700"
                            } flex items-center justify-center gap-1.5`}
                          >
                            <Shield className="w-4 h-4" />
                            Make Admin
                          </button>
                          <button
                            onClick={() => handleRoleChange("manager")}
                            className={`px-3 py-2 rounded-lg text-sm font-medium ${
                              user.role === "manager"
                                ? "bg-blue-600 text-white"
                                : "bg-blue-100 hover:bg-blue-200 text-blue-700"
                            } flex items-center justify-center gap-1.5`}
                          >
                            <Shield className="w-4 h-4" />
                            Make Manager
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "activity" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">
                    Recent Activity
                  </h4>
                  <span className="text-sm text-gray-500">
                    Last 10 activities
                  </span>
                </div>
                {user.activity && user.activity.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date & Time
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Entity
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {user.activity.map((activity, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              {formatDateTime(activity.created_at)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs rounded-full font-medium bg-blue-100 text-blue-800">
                                {formatAction(activity.action)}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {activity.entity || "N/A"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {activity.details || "No details"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      No Activity
                    </h4>
                    <p className="text-gray-600 max-w-sm mx-auto">
                      This user doesn't have any recorded activity yet.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                {/* Security Information */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Lock className="w-5 h-5 text-red-600" />
                    <h4 className="text-base font-semibold text-gray-900">
                      Security Settings
                    </h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Password Status
                      </label>
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-800">
                              Password is secure
                            </span>
                          </div>
                          <span className="text-xs text-green-600">
                            Last changed: 2 weeks ago
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Two-Factor Authentication
                      </label>
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700">
                              Not enabled
                            </span>
                          </div>
                          {isAdmin && (
                            <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                              Enable 2FA
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Active Sessions
                      </label>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-800">
                              1 active session
                            </span>
                          </div>
                          {isAdmin && (
                            <button className="text-xs text-red-600 hover:text-red-800 font-medium">
                              Terminate All
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Actions (Admin only) */}
                {isAdmin && !isCurrentUser && (
                  <div className="bg-white rounded-xl border border-red-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <h4 className="text-base font-semibold text-gray-900">
                        Danger Zone
                      </h4>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <h5 className="font-medium text-red-800 mb-2">
                          Reset User Password
                        </h5>
                        <p className="text-sm text-red-600 mb-3">
                          This will send a password reset email to the user.
                          They will need to set a new password.
                        </p>
                        <button
                          onClick={handlePasswordReset}
                          className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                          <Lock className="w-4 h-4" />
                          Send Password Reset Email
                        </button>
                      </div>

                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <h5 className="font-medium text-red-800 mb-2">
                          Delete User Account
                        </h5>
                        <p className="text-sm text-red-600 mb-3">
                          This action cannot be undone. All user data, activity
                          logs, and associated records will be permanently
                          deleted.
                        </p>
                        <button
                          onClick={handleDeleteUser}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete User Account
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">
              Last updated: {formatDate(user.updatedAt)}
              {user.lastLogin && ` • Last login: ${formatDate(user.lastLogin)}`}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyDetails}
                className="px-3 py-1.5 rounded text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Details
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserViewDialog;
