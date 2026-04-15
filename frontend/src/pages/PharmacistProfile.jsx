import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, ArrowLeft, Mail, Phone, Calendar, Award } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { authAPI, pharmacistAPI } from '../services/api';

const PharmacistProfile = () => {
  const { user: authUser, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: '',
    role: '',
    department: '',
    licenseStatus: '',
    isActive: true,
    createdAt: '',
    updatedAt: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    loadProfile();
  }, []);

  const normalizeProfilePayload = (response) => {
    if (!response) return null;

    // Backend /auth/me returns { success, data: user }
    if (response.data && typeof response.data === 'object') {
      return response.data;
    }

    // Login/register responses expose { user }
    if (response.user && typeof response.user === 'object') {
      return response.user;
    }

    // Already-normalized user object fallback
    return response;
  };

  const buildFallbackProfile = () => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    return {
      ...(storedUser || {}),
      ...(authUser || {})
    };
  };

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        phone: profile.phone || '',
        email: profile.email || '',
        age: profile.age || '',
        gender: profile.gender || '',
        role: profile.role || '',
        department: profile.department || '',
        licenseStatus: profile.licenseStatus || 'active',
        isActive: profile.isActive !== false,
        createdAt: profile.createdAt || '',
        updatedAt: profile.updatedAt || '',
        address: {
          street: profile.address?.street || '',
          city: profile.address?.city || '',
          state: profile.address?.state || '',
          zipCode: profile.address?.zipCode || ''
        }
      });
    }
  }, [profile]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please log in again.');
        return;
      }
      
      console.log('Loading profile with token:', token.substring(0, 20) + '...');
      
      const response = await authAPI.getProfile();
      console.log('Profile response:', response);

      const normalizedProfile = normalizeProfilePayload(response);

      if (normalizedProfile && (normalizedProfile.name || normalizedProfile.email)) {
        setProfile(normalizedProfile);
        setError('');
      } else {
        const fallbackProfile = buildFallbackProfile();
        if (fallbackProfile && (fallbackProfile.name || fallbackProfile.email)) {
          setProfile(fallbackProfile);
          setError('');
        } else {
          setError('Profile data is not available yet. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      
      if (error.response?.status === 401) {
        setError('Authentication expired. Please log in again.');
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else if (error.response?.status === 403) {
        setError('Access denied. You do not have permission to view this profile.');
      } else if (error.response?.status === 404) {
        setError('Profile endpoint not found. Please check the server configuration.');
      } else {
        // If backend returns an error but we have local auth data, still show it.
        const fallbackProfile = buildFallbackProfile();
        if (fallbackProfile && (fallbackProfile.name || fallbackProfile.email)) {
          setProfile(fallbackProfile);
          setError('');
        } else {
          setError('Failed to load profile data. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRecentOrders = async () => {
    try {
      const response = await pharmacistAPI.getQueue({ status: 'all' });
      const queueRows = Array.isArray(response?.data?.queue) ? response.data.queue : [];
      setRecentOrders(queueRows.slice(0, 8));
    } catch (queueError) {
      console.error('Failed to load pharmacist queue for profile:', queueError);
      setRecentOrders([]);
    }
  };

  useEffect(() => {
    loadRecentOrders();
  }, []);

  const submitChanges = async () => {
    try {
      setLoading(true);
      const updateData = {
        name: form.name,
        phone: form.phone,
        email: form.email,
        age: form.age,
        gender: form.gender,
        role: form.role,
        department: form.department,
        licenseStatus: form.licenseStatus,
        isActive: form.isActive,
        address: form.address
      };
      const response = await authAPI.updateProfile(updateData);
      console.log('Profile updated successfully:', response);
      
      // Update local storage user data as well
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...currentUser, ...updateData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update the profile state immediately with form data
      setProfile(prev => ({ ...prev, ...updateData }));
      
      // Don't call loadProfile() here since we already have the updated data
      setEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to save profile:', err);
      alert('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50/60">
        <div className="h-10 w-10 rounded-full border-b-2 border-sky-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50/60">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-x-3">
            <Button onClick={loadProfile}>Try Again</Button>
            {error.includes('Authentication') || error.includes('token') ? (
              <Button onClick={() => window.location.href = '/'}>
                Login Again
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-50/60 via-white to-slate-100/60">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b border-sky-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/pharmacist" className="text-slate-400 hover:text-sky-700 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-semibold text-slate-900">Pharmacist Profile</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">Pharmacist {authUser?.name}</span>
              {editing ? (
                <>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={submitChanges}>Save</Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              )}
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="bg-white rounded-xl border border-sky-100 shadow-sm">
            <div className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-linear-to-br from-sky-600 to-cyan-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                  {profile?.name?.charAt(0)?.toUpperCase() || 'P'}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{form.name || profile?.name}</h2>
                  <p className="text-slate-600 capitalize">{form.role || profile?.role}</p>
                  <p className="text-sm text-slate-500">Member since {form.createdAt ? new Date(form.createdAt).toLocaleDateString() : (profile?.createdAt ? new Date(profile?.createdAt).toLocaleDateString() : 'N/A')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl border border-sky-100 shadow-sm">
              <div className="p-6 border-b border-sky-100">
                <h3 className="text-lg font-semibold text-slate-900">Basic Information</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-2">Email</p>
                  {editing ? (
                    <Input
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email"
                      type="email"
                    />
                  ) : (
                    <p className="text-slate-900 flex items-center">
                      <Mail className="w-5 h-5 text-slate-400 mr-3" />
                      {form.email || profile?.email}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-2">Name</p>
                  {editing ? (
                    <Input
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter name"
                    />
                  ) : (
                    <p className="text-slate-900 flex items-center">
                      <User className="w-5 h-5 text-slate-400 mr-3" />
                      {form.name || profile?.name}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-2">Phone</p>
                  {editing ? (
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="text-slate-900 flex items-center">
                      <Phone className="w-5 h-5 text-slate-400 mr-3" />
                      {form.phone || profile?.phone || 'Not provided'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-2">Age</p>
                  {editing ? (
                    <Input
                      value={form.age}
                      onChange={(e) => setForm(prev => ({ ...prev, age: e.target.value }))}
                      placeholder="Enter age"
                      type="number"
                    />
                  ) : (
                    <p className="text-slate-900">{form.age || profile?.age || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-2">Gender</p>
                  {editing ? (
                    <select
                      value={form.gender}
                      onChange={(e) => setForm(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  ) : (
                    <p className="text-slate-900 capitalize">{form.gender || profile?.gender || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-2">Role</p>
                  {editing ? (
                    <select
                      value={form.role || profile?.role || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="pharmacist">Pharmacist</option>
                      <option value="senior-pharmacist">Senior Pharmacist</option>
                      <option value="pharmacy-manager">Pharmacy Manager</option>
                    </select>
                  ) : (
                    <p className="text-slate-900 flex items-center">
                      <span className="capitalize">{form.role || profile?.role}</span>
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-2">Joined</p>
                  {editing ? (
                    <input
                      type="date"
                      value={form.createdAt ? new Date(form.createdAt).toISOString().split('T')[0] : ''}
                      onChange={(e) => setForm(prev => ({ ...prev, createdAt: e.target.value }))}
                      placeholder="Join date"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  ) : (
                    <p className="text-slate-900 flex items-center">
                      <Calendar className="w-5 h-5 text-slate-400 mr-3" />
                      {form.createdAt ? new Date(form.createdAt).toLocaleDateString() : (profile?.createdAt ? new Date(profile?.createdAt).toLocaleDateString() : 'N/A')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white rounded-xl border border-sky-100 shadow-sm">
              <div className="p-6 border-b border-sky-100">
                <h3 className="text-lg font-semibold text-slate-900">Address Information</h3>
              </div>
              <div className="p-6">
                {profile?.address || editing ? (
                  <div className="space-y-4">
                    {editing ? (
                      <>
                        <Input
                          label="Street"
                          value={form.address.street}
                          onChange={(e) => setForm(prev => ({ ...prev, address: { ...prev.address, street: e.target.value } }))}
                          placeholder="Street address"
                        />
                        <Input
                          label="City"
                          value={form.address.city}
                          onChange={(e) => setForm(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))}
                          placeholder="City"
                        />
                        <Input
                          label="State"
                          value={form.address.state}
                          onChange={(e) => setForm(prev => ({ ...prev, address: { ...prev.address, state: e.target.value } }))}
                          placeholder="State"
                        />
                        <Input
                          label="Zip Code"
                          value={form.address.zipCode}
                          onChange={(e) => setForm(prev => ({ ...prev, address: { ...prev.address, zipCode: e.target.value } }))}
                          placeholder="Zip code"
                        />
                      </>
                    ) : (
                      <div className="text-slate-900">
                        {form.address.street && <p>{form.address.street}</p>}
                        {form.address.city && <p>{form.address.city}</p>}
                        {form.address.state && form.address.zipCode && (
                          <p>{form.address.state} {form.address.zipCode}</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500">No address information available</p>
                )}
              </div>
            </div>

            {/* Professional Information */}
            <div className="bg-white rounded-xl border border-sky-100 shadow-sm">
              <div className="p-6 border-b border-sky-100">
                <h3 className="text-lg font-semibold text-slate-900">Professional Information</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <Award className="w-5 h-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600 mb-2">License Status</p>
                    {editing ? (
                      <select
                        value={form.licenseStatus || profile?.licenseStatus || 'active'}
                        onChange={(e) => setForm(prev => ({ ...prev, licenseStatus: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="suspended">Suspended</option>
                        <option value="pending">Pending</option>
                      </select>
                    ) : (
                      <p className="text-slate-900">{form.licenseStatus || profile?.licenseStatus || 'Active'} Pharmacist License</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600 mb-2">Department</p>
                    {editing ? (
                      <Input
                        value={form.department || profile?.department || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, department: e.target.value }))}
                        placeholder="Department"
                      />
                    ) : (
                      <p className="text-slate-900">{form.department || profile?.department || 'Pharmacy Services'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div className="bg-white rounded-xl border border-sky-100 shadow-sm">
              <div className="p-6 border-b border-sky-100">
                <h3 className="text-lg font-semibold text-slate-900">Account Status</h3>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-slate-600">Account Status</span>
                  {editing ? (
                    <select
                      value={form.isActive !== undefined ? form.isActive.toString() : (profile?.isActive !== false ? 'true' : 'false')}
                      onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      profile?.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {profile?.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-sm text-slate-600 mb-2">Last Updated</p>
                  {editing ? (
                    <Input
                      value={form.updatedAt ? new Date(form.updatedAt).toLocaleDateString() : ''}
                      onChange={(e) => setForm(prev => ({ ...prev, updatedAt: e.target.value }))}
                      placeholder="Last updated date"
                      type="date"
                    />
                  ) : (
                    <p className="text-slate-900">{new Date(profile?.updatedAt).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-sky-100 shadow-sm">
            <div className="p-6 border-b border-sky-100">
              <h3 className="text-lg font-semibold text-slate-900">Recent Pharmacy Orders</h3>
            </div>
            <div className="p-6">
              {recentOrders.length === 0 ? (
                <p className="text-sm text-slate-500">No recent orders available.</p>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div key={order?._id || order?.orderId} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-900">Order #{order?.orderId || '-'}</p>
                      <p className="text-xs text-slate-600 mt-1">Patient: {order?.patientDetails?.name || order?.patientId?.name || 'Patient'}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="px-2 py-1 text-xs rounded-full bg-sky-100 text-sky-700">{order?.status || '-'}</span>
                        <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700">{order?.priority || '-'}</span>
                        {order?.emergencyPrePack && (
                          <span className="px-2 py-1 text-xs rounded-full bg-rose-100 text-rose-700">Emergency Pre-Pack</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PharmacistProfile;