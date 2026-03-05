import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProfileCard from '../components/ProfileCard';
import InfoSection from '../components/InfoSection';
import Button from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

const AdminProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(user || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [form, setForm] = useState({
    name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipCode: ''
  });

  const syncForm = (nextProfile) => {
    setForm({
      name: nextProfile?.name || '',
      phone: nextProfile?.phone || '',
      street: nextProfile?.address?.street || '',
      city: nextProfile?.address?.city || '',
      state: nextProfile?.address?.state || '',
      zipCode: nextProfile?.address?.zipCode || ''
    });
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const response = await authAPI.getProfile();
        const nextProfile = response?.data || null;
        setProfile(nextProfile);
        syncForm(nextProfile);
      } catch (error) {
        const fallback = user || null;
        setProfile(fallback);
        syncForm(fallback);
        setNotice({ type: 'error', message: error?.message || 'Unable to fetch admin profile.' });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const profileDetails = useMemo(() => ([
    { label: 'Role', value: profile?.role || 'admin' },
    { label: 'Email', value: profile?.email || 'Not provided' },
    { label: 'Phone', value: profile?.phone || 'Not provided' },
    { label: 'Last Login', value: profile?.lastLogin ? new Date(profile.lastLogin).toLocaleString() : 'N/A' }
  ]), [profile]);

  const accountItems = [
    { label: 'Name', value: profile?.name || '-' },
    { label: 'Account Status', value: profile?.isActive ? 'Active' : 'Inactive' },
    { label: 'Verification', value: profile?.isVerified ? 'Verified' : 'Pending' }
  ];

  const addressItems = [
    { label: 'Street', value: profile?.address?.street || 'Not set' },
    { label: 'City', value: profile?.address?.city || 'Not set' },
    { label: 'State', value: profile?.address?.state || 'Not set' },
    { label: 'Zip Code', value: profile?.address?.zipCode || 'Not set' }
  ];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setNotice({ type: '', message: '' });

      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: {
          street: form.street.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          zipCode: form.zipCode.trim(),
          country: profile?.address?.country || 'India'
        }
      };

      const response = await authAPI.updateProfile(payload);
      const updated = response?.data || profile;
      setProfile(updated);
      setIsEditing(false);
      setNotice({ type: 'success', message: 'Admin profile updated successfully.' });

      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...storedUser, ...updated }));
      } catch {
        // ignore storage issues
      }
    } catch (error) {
      setNotice({ type: 'error', message: error?.message || 'Failed to update admin profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    syncForm(profile);
    setIsEditing(false);
    setNotice({ type: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <Link to="/admin">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 text-sm text-gray-600">Loading profile...</div>
        ) : (
          <ProfileCard name={profile?.name || 'Admin'} role={profile?.role || 'admin'} details={profileDetails} />
        )}

        {notice.message && (
          <div className={`rounded-lg border px-4 py-3 text-sm ${
            notice.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {notice.message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InfoSection title="Account Details" items={accountItems} />
          <InfoSection title="Address" items={addressItems} />
        </div>

        {isEditing && (
          <section className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Admin Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Name</label>
                <input name="name" value={form.name} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Street</label>
                <input name="street" value={form.street} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">City</label>
                <input name="city" value={form.city} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">State</label>
                <input name="state" value={form.state} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Zip Code</label>
                <input name="zipCode" value={form.zipCode} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          {isEditing ? (
            <>
              <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Profile'}</Button>
              <Button variant="secondary" onClick={handleCancel} disabled={isSaving}>Cancel</Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
