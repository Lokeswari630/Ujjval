import React from 'react';

const ProfileCard = ({ name, role, details = [] }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold">
          {name?.charAt(0) || 'U'}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{name}</h2>
          <p className="text-sm text-blue-600 capitalize">{role}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {details.map((detail, index) => (
          <div key={`${detail.label}-${index}`} className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">{detail.label}</p>
            <p className="text-sm font-medium text-gray-900 mt-1">{detail.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfileCard;
