import React from 'react';

const InfoSection = ({ title, items = [] }) => {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="flex items-start justify-between bg-blue-50 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              {item.subtext && <p className="text-xs text-gray-600 mt-1">{item.subtext}</p>}
            </div>
            {item.value && <span className="text-sm text-blue-700 font-medium">{item.value}</span>}
          </div>
        ))}
      </div>
    </section>
  );
};

export default InfoSection;
