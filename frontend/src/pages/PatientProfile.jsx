import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProfileCard from '../components/ProfileCard';
import InfoSection from '../components/InfoSection';
import Button from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

const PatientProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(user || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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
        const fallbackProfile = user || null;
        setProfile(fallbackProfile);
        syncForm(fallbackProfile);
        setNotice({
          type: 'error',
          message: error?.message || 'Unable to fetch profile from server.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const profileDetails = useMemo(() => ([
    { label: 'Age', value: profile?.age ? String(profile.age) : 'Not provided' },
    { label: 'Gender', value: profile?.gender ? String(profile.gender) : 'Not provided' },
    { label: 'Phone', value: profile?.phone || 'Not provided' },
    { label: 'Email', value: profile?.email || 'Not provided' }
  ]), [profile]);

  const accountItems = [
    { label: 'Full Name', value: profile?.name || '-' },
    { label: 'Role', value: profile?.role || 'patient' },
    { label: 'Last Login', value: profile?.lastLogin ? new Date(profile.lastLogin).toLocaleString() : 'N/A' }
  ];

  const addressItems = [
    { label: 'Street', value: profile?.address?.street || 'Not set' },
    { label: 'City', value: profile?.address?.city || 'Not set' },
    { label: 'State', value: profile?.address?.state || 'Not set' },
    { label: 'Zip Code', value: profile?.address?.zipCode || 'Not set' }
  ];

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
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
      const updatedProfile = response?.data || profile;
      setProfile(updatedProfile);
      setIsEditing(false);
      setNotice({ type: 'success', message: 'Profile updated successfully.' });

      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...storedUser, ...updatedProfile }));
      } catch {
        // Ignore localStorage parsing issues
      }
    } catch (error) {
      setNotice({
        type: 'error',
        message: error?.message || 'Failed to update profile.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    syncForm(profile);
    setIsEditing(false);
    setNotice({ type: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <Link to="/patient">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 text-sm text-gray-600">Loading profile...</div>
        ) : (
          <ProfileCard name={profile?.name || 'Patient'} role={profile?.role || 'patient'} details={profileDetails} />
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Name</label>
                <input name="name" value={form.name} onChange={handleFormChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Phone</label>
                <input name="phone" value={form.phone} onChange={handleFormChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Street</label>
                <input name="street" value={form.street} onChange={handleFormChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">City</label>
                <input name="city" value={form.city} onChange={handleFormChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">State</label>
                <input name="state" value={form.state} onChange={handleFormChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Zip Code</label>
                <input name="zipCode" value={form.zipCode} onChange={handleFormChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>
          </section>
        )}

        <div className="flex gap-3">
          {isEditing ? (
            <>
              <Button onClick={handleSaveProfile} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Profile'}</Button>
              <Button variant="secondary" onClick={handleCancelEdit} disabled={isSaving}>Cancel</Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
