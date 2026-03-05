import React from 'react';
import ProfileCard from '../components/ProfileCard';
import InfoSection from '../components/InfoSection';
import Button from '../components/Button';

const AdminProfile = () => {
  const profile = {
    name: 'Admin User',
    role: 'admin',
    details: [
      { label: 'Department', value: 'Operations' },
      { label: 'Access Level', value: 'Super Admin' },
      { label: 'Region', value: 'Main Campus' },
      { label: 'Shift', value: '09:00 AM - 06:00 PM' }
    ]
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <ProfileCard name={profile.name} role={profile.role} details={profile.details} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InfoSection
            title="Manage Doctors"
            items={[
              { label: 'Total Doctors', value: '42' },
              { label: 'Pending Verifications', value: '3' }
            ]}
          />
          <InfoSection
            title="Manage Appointments"
            items={[
              { label: 'Today\'s Appointments', value: '128' },
              { label: 'Pending Confirmations', value: '14' }
            ]}
          />
          <InfoSection
            title="Reports Dashboard"
            items={[
              { label: 'Monthly Report', subtext: 'Generated on Mar 1' },
              { label: 'Pharmacy Performance', subtext: 'Queue wait reduced by 22%' }
            ]}
          />
          <InfoSection
            title="System Analytics"
            items={[
              { label: 'Daily Active Users', value: '1,240' },
              { label: 'AI Queries Processed', value: '3,540' }
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button>Manage Doctors</Button>
          <Button variant="secondary">Manage Appointments</Button>
          <Button variant="ghost">View Analytics</Button>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
