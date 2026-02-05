// MyProfileView.tsx
import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, MapPin, Calendar, Edit, Save, X,
  Shield, Briefcase, Clock, CheckCircle, Upload, Camera
} from 'lucide-react';
import { kabAuthStore } from '../../../../../lib/kabAuthStore';
import userAPI from '../../../../../apis/user';
import { showError, showSuccess } from '../../../../../utils/notification';

interface ProfileData {
  id: number;
  username: string;
  email: string;
  name?: string;
  contact?: string;
  address?: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  profilePicture?: string;
}

interface EditFieldProps {
  label: string;
  value: string;
  isEditing: boolean;
  onEdit: () => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}

const EditField: React.FC<EditFieldProps> = ({
  label,
  value,
  isEditing,
  onEdit,
  children,
  icon
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <div className="text-gray-600">{icon}</div>
          </div>
          <label className="text-sm font-medium text-gray-700">{label}</label>
        </div>
        {!isEditing && (
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-600"
            title={`Edit ${label}`}
          >
            <Edit className="w-4 h-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
};

const MyProfileView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact: '',
    address: ''
  });
  const [isEditingField, setIsEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Get current user from auth store
  const currentUser = kabAuthStore.getUser();

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser?.id) return;

      try {
        setLoading(true);
        const response = await userAPI.getUserById(currentUser.id);
        
        if (response.status && response.data.user) {
          const userData = response.data.user;
          setProfile(userData);
          setFormData({
            name: userData.name || '',
            email: userData.email || '',
            contact: userData.contact || '',
            address: userData.address || ''
          });
        } else {
          showError('Failed to load profile data');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        showError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser?.id]);

  // Handle field edit start
  const startEditing = (field: string, value: string) => {
    setIsEditingField(field);
    setTempValue(value);
  };

  // Handle field edit cancel
  const cancelEditing = () => {
    setIsEditingField(null);
    setTempValue('');
  };

  // Handle field save
  const saveField = async () => {
    if (!profile || !isEditingField) return;

    try {
      const updates: any = {};
      updates[isEditingField] = tempValue;

      const response = await userAPI.updateProfile(profile.id, updates);
      
      if (response.status && response.data.user) {
        setProfile(response.data.user);
        setFormData(prev => ({
          ...prev,
          [isEditingField]: tempValue
        }));
        showSuccess(`${isEditingField.charAt(0).toUpperCase() + isEditingField.slice(1)} updated successfully`);
        
        // Update auth store
        kabAuthStore.updateUserProfile(response.data.user);
      } else {
        showError(`Failed to update ${isEditingField}`);
      }
    } catch (error) {
      console.error(`Error updating ${isEditingField}:`, error);
      showError(`Failed to update ${isEditingField}`);
    } finally {
      cancelEditing();
    }
  };

  // Handle profile picture upload
  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    try {
      setUploadingPhoto(true);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Image = e.target?.result as string;
        
        const response = await userAPI.uploadProfilePicture(
          profile.id,
          base64Image,
          undefined,
          file.type
        );
        
        if (response.status && response.data.user) {
          setProfile(response.data.user);
          showSuccess('Profile picture updated successfully');
          
          // Update auth store
          kabAuthStore.updateUserProfile(response.data.user);
        } else {
          showError('Failed to upload profile picture');
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      showError('Failed to upload profile picture');
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Not Found</h3>
        <p className="text-gray-600">Unable to load your profile information.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {profile.profilePicture ? (
                    <img
                      src={profile.profilePicture}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    profile.name?.charAt(0) || profile.username.charAt(0).toUpperCase()
                  )}
                </div>
                <label
                  htmlFor="profile-picture-upload"
                  className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border-2 border-white flex items-center justify-center shadow-md cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Camera className="w-4 h-4 text-gray-600" />
                  <input
                    id="profile-picture-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfilePictureUpload}
                    disabled={uploadingPhoto}
                  />
                </label>
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.name || profile.username}
                </h1>
                <p className="text-gray-600">{profile.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(profile.role)}`}>
                    <Shield className="w-3 h-3 inline mr-1" />
                    {profile.role.toUpperCase()}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(profile.isActive)}`}>
                    {profile.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">User ID</div>
              <div className="text-lg font-mono font-bold text-gray-900">#{profile.id}</div>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Personal Info */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-green-600" />
                  Personal Information
                </h3>
                
                {/* Name Field */}
                <EditField
                  label="Full Name"
                  value={formData.name}
                  isEditing={isEditingField === 'name'}
                  onEdit={() => startEditing('name', formData.name)}
                  icon={<User className="w-4 h-4" />}
                >
                  {isEditingField === 'name' ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Enter your full name"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveField}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors flex items-center gap-1"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-white rounded-lg border border-gray-200">
                      <span className="text-gray-900">{formData.name || 'Not set'}</span>
                    </div>
                  )}
                </EditField>

                {/* Email Field */}
                <div className="mt-4">
                  <EditField
                    label="Email Address"
                    value={formData.email}
                    isEditing={isEditingField === 'email'}
                    onEdit={() => startEditing('email', formData.email)}
                    icon={<Mail className="w-4 h-4" />}
                  >
                    {isEditingField === 'email' ? (
                      <div className="space-y-2">
                        <input
                          type="email"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Enter your email"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={saveField}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                          >
                            <Save className="w-4 h-4" />
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors flex items-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-white rounded-lg border border-gray-200">
                        <span className="text-gray-900">{formData.email}</span>
                      </div>
                    )}
                  </EditField>
                </div>

                {/* Contact Field */}
                <div className="mt-4">
                  <EditField
                    label="Contact Number"
                    value={formData.contact}
                    isEditing={isEditingField === 'contact'}
                    onEdit={() => startEditing('contact', formData.contact)}
                    icon={<Phone className="w-4 h-4" />}
                  >
                    {isEditingField === 'contact' ? (
                      <div className="space-y-2">
                        <input
                          type="tel"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Enter your contact number"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={saveField}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                          >
                            <Save className="w-4 h-4" />
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors flex items-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-white rounded-lg border border-gray-200">
                        <span className="text-gray-900">{formData.contact || 'Not set'}</span>
                      </div>
                    )}
                  </EditField>
                </div>
              </div>
            </div>

            {/* Right Column - Additional Info */}
            <div className="space-y-6">
              {/* Address Field */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Address Information
                  </h3>
                </div>
                
                <EditField
                  label="Address"
                  value={formData.address}
                  isEditing={isEditingField === 'address'}
                  onEdit={() => startEditing('address', formData.address)}
                  icon={<MapPin className="w-4 h-4" />}
                >
                  {isEditingField === 'address' ? (
                    <div className="space-y-2">
                      <textarea
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Enter your address"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveField}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors flex items-center gap-1"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-white rounded-lg border border-gray-200 min-h-[60px]">
                      <span className="text-gray-900 whitespace-pre-line">
                        {formData.address || 'Not set'}
                      </span>
                    </div>
                  )}
                </EditField>
              </div>

              {/* Account Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-purple-600" />
                  Account Information
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Username</div>
                        <div className="text-sm text-gray-600">Used for login</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{profile.username}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Member Since</div>
                        <div className="text-sm text-gray-600">Account creation date</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{formatDate(profile.createdAt)}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Last Login</div>
                        <div className="text-sm text-gray-600">Most recent access</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        {profile.lastLogin ? formatDate(profile.lastLogin) : 'Never'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Profile Updated</div>
                        <div className="text-sm text-gray-600">Last profile change</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{formatDate(profile.updatedAt)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Tip:</span> Click the edit icon next to any field to update your information
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.href = '/change-password'}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Change Password
              </button>
              <button
                onClick={() => kabAuthStore.logout()}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfileView;