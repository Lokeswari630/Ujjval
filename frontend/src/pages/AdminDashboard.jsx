import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Calendar, Activity, TrendingUp, Shield } from 'lucide-react';
import Button from '../components/ui/Button';
import HealthChart from '../components/charts/HealthChart';
import NLPChat from '../components/chat/NLPChat';
import { usersAPI, appointmentsAPI, healthPredictionAPI } from '../services/api';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    appointments: 0,
    predictions: 0,
    highRisk: 0
  });

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        setLoading(true);
        const [users, appointments, predictionStats, highRisk] = await Promise.all([
          usersAPI.getAll({ limit: 5 }),
          appointmentsAPI.getAll({ limit: 10 }),
          healthPredictionAPI.getStats(),
          APIHighRiskFallback(healthPredictionAPI)
        ]);

        setStats({
          users: users?.pagination?.total || users?.data?.length || 0,
          appointments: appointments?.pagination?.total || appointments?.data?.length || 0,
          predictions: predictionStats?.data?.total || 0,
          highRisk: highRisk?.data?.length || 0
        });
      } catch (error) {
        console.error('Failed to load admin dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, []);

  const usageData = [
    { name: 'Mon', value: 42 },
    { name: 'Tue', value: 56 },
    { name: 'Wed', value: 61 },
    { name: 'Thu', value: 73 },
    { name: 'Fri', value: 88 },
    { name: 'Sat', value: 49 },
    { name: 'Sun', value: 37 }
  ];

  const riskData = [
    { name: 'Low', value: 48 },
    { name: 'Medium', value: 31 },
    { name: 'High', value: 16 },
    { name: 'Urgent', value: 5 }
  ];

  const cards = [
    { title: 'Users', value: stats.users, icon: <Users className="w-6 h-6" />, color: 'bg-blue-500' },
    { title: 'Appointments', value: stats.appointments, icon: <Calendar className="w-6 h-6" />, color: 'bg-green-500' },
    { title: 'Predictions', value: stats.predictions, icon: <Activity className="w-6 h-6" />, color: 'bg-purple-500' },
    { title: 'High-Risk Patients', value: stats.highRisk, icon: <Shield className="w-6 h-6" />, color: 'bg-red-500' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Admin {user?.name}</span>
              <Button variant="outline" onClick={logout}>Logout</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {cards.map((card) => (
                <div key={card.title} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-white`}>
                      {card.icon}
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">{card.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HealthChart type="bar" data={usageData} title="System Usage (Weekly)" />
              <HealthChart type="pie" data={riskData} title="Risk Distribution" />
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button className="w-full">Manage Doctors</Button>
                <Button className="w-full" variant="secondary">Manage Patients</Button>
                <Button className="w-full" variant="outline">Manage Pharmacists</Button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Query Assistant</h2>
              <NLPChat />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

async function APIHighRiskFallback(healthPredictionAPI) {
  try {
    return await healthPredictionAPI.getHighRisk();
  } catch {
    return { data: [] };
  }
}

export default AdminDashboard;
