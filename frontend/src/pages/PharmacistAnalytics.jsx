import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, ArrowLeft, BarChart3, Clock, CheckCircle2 } from 'lucide-react';
import Button from '../components/ui/Button';
import HealthChart from '../components/charts/HealthChart';
import { pharmacyAPI } from '../services/api';

const PharmacistAnalytics = () => {
  const { user, logout } = useAuth();
  const [data, setData] = useState({
    stats: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const stats = await pharmacyAPI.getStats();

      setData({
        stats: stats.data || {}
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const priorityDistribution = [
    { name: 'Urgent', value: data.stats?.priorityDistribution?.urgent || 0 },
    { name: 'High', value: data.stats?.priorityDistribution?.high || 0 },
    { name: 'Medium', value: data.stats?.priorityDistribution?.medium || 0 },
    { name: 'Low', value: data.stats?.priorityDistribution?.low || 0 }
  ];

  const orderTrends = [
    { name: 'Total', value: data.stats?.totalOrders || 0 },
    { name: 'Completed', value: data.stats?.completedOrders || 0 },
    { name: 'Pending', value: Math.max((data.stats?.totalOrders || 0) - (data.stats?.completedOrders || 0), 0) }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50/60">
        <div className="h-10 w-10 rounded-full border-b-2 border-sky-600 animate-spin" />
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
              <h1 className="text-xl font-semibold text-slate-900">Pharmacy Analytics</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">Pharmacist {user?.name}</span>
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
          <section className="bg-linear-to-r from-sky-700 via-sky-600 to-cyan-600 rounded-2xl p-6 text-white shadow-lg shadow-sky-300/40 border border-sky-300/30">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Insights Overview</h2>
                <p className="text-sky-100 mt-1">Performance trends and workload distribution</p>
              </div>
              <BarChart3 className="w-12 h-12 text-white/70" />
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-sky-100 shadow-sm p-5">
              <p className="text-sm text-slate-600">Total Orders</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{data.stats?.totalOrders || 0}</p>
              <div className="mt-3 flex items-center gap-2 text-sky-700 text-sm font-semibold"><TrendingUp className="w-4 h-4" /> Throughput</div>
            </div>
            <div className="bg-white rounded-xl border border-sky-100 shadow-sm p-5">
              <p className="text-sm text-slate-600">Completed</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{data.stats?.completedOrders || 0}</p>
              <div className="mt-3 flex items-center gap-2 text-emerald-700 text-sm font-semibold"><CheckCircle2 className="w-4 h-4" /> Fulfillment</div>
            </div>
            <div className="bg-white rounded-xl border border-sky-100 shadow-sm p-5">
              <p className="text-sm text-slate-600">Avg Prep Time</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{data.stats?.averagePrepTime || 0} min</p>
              <div className="mt-3 flex items-center gap-2 text-indigo-700 text-sm font-semibold"><Clock className="w-4 h-4" /> Efficiency</div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-sky-100 shadow-sm p-4">
              <HealthChart
                type="bar"
                data={orderTrends}
                title="Weekly Order Trends"
              />
            </div>
            <div className="bg-white rounded-xl border border-sky-100 shadow-sm p-4">
              <HealthChart
                type="pie"
                data={priorityDistribution}
                title="Priority Distribution"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PharmacistAnalytics;