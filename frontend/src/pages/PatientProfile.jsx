import React from 'react';
import ProfileCard from '../components/ProfileCard';
import InfoSection from '../components/InfoSection';
import Button from '../components/Button';

const PatientProfile = () => {
  const profile = {
    name: 'John Doe',
    role: 'patient',
    details: [
      { label: 'Age', value: '32' },
      { label: 'Gender', value: 'Male' },
      { label: 'Blood Group', value: 'B+' },
      { label: 'Primary Doctor', value: 'Dr. Sarah Smith' }
    ]
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <ProfileCard name={profile.name} role={profile.role} details={profile.details} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InfoSection
            title="Medical History"
            items={[
              { label: 'Hypertension', subtext: 'Diagnosed: 2023' },
              { label: 'Seasonal Allergy', subtext: 'Managed with medication' }
            ]}
          />
          <InfoSection
            title="Prescriptions"
            items={[
              { label: 'Amlodipine 5mg', value: 'Daily' },
              { label: 'Cetirizine 10mg', value: 'As needed' }
            ]}
          />
          <InfoSection
            title="Upcoming Appointments"
            items={[
              { label: 'Cardiology Follow-up', subtext: 'Mar 10, 10:00 AM' },
              { label: 'General Checkup', subtext: 'Mar 18, 12:30 PM' }
            ]}
          />
        </div>
        <div>
          <Button>Edit Profile</Button>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
