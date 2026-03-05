import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Users, Activity, Clock, TrendingUp, Stethoscope, FileText } from 'lucide-react';
import Button from '../components/ui/Button';
import HealthChart from '../components/charts/HealthChart';
import NLPChat from '../components/chat/NLPChat';
import { appointmentsAPI, doctorsAPI } from '../services/api';

const DoctorDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState({
    appointments: [],
    profile: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const isMissingDoctorProfileError = (error) => {
    if (!error) return false;
    const message = typeof error === 'string' ? error : error.message;
    return typeof message === 'string' && message.toLowerCase().includes('doctor profile not found');
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [appointmentsResult, profileResult] = await Promise.allSettled([
        appointmentsAPI.getAll({ status: 'scheduled' }),
        doctorsAPI.getProfile()
      ]);

      if (appointmentsResult.status === 'rejected') {
        throw appointmentsResult.reason;
      }

      if (profileResult.status === 'rejected' && !isMissingDoctorProfileError(profileResult.reason)) {
        throw profileResult.reason;
      }

      setData({
        appointments: appointmentsResult.value.data || [],
        profile: profileResult.status === 'fulfilled' ? profileResult.value.data : null
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const uniquePatients = new Set(
    data.appointments
      .map((appointment) => appointment?.patientId?._id)
      .filter(Boolean)
  ).size;

  const appointmentTrendsMap = data.appointments.reduce((acc, appointment) => {
    const dateValue = appointment?.date;
    if (!dateValue) return acc;
    const date = new Date(dateValue);
    const day = date.toLocaleDateString('en-US', { weekday: 'short' });
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const weekDayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const appointmentTrends = weekDayOrder.map((day) => ({
    name: day,
    value: appointmentTrendsMap[day] || 0
  }));

  const demographicBuckets = data.appointments.reduce((acc, appointment) => {
    const age = appointment?.patientId?.age;
    if (typeof age !== 'number') return acc;
    if (age <= 18) acc['0-18'] += 1;
    else if (age <= 35) acc['19-35'] += 1;
    else if (age <= 50) acc['36-50'] += 1;
    else acc['51+'] += 1;
    return acc;
  }, { '0-18': 0, '19-35': 0, '36-50': 0, '51+': 0 });

  const patientDemographics = [
    { name: '0-18', value: demographicBuckets['0-18'] },
    { name: '19-35', value: demographicBuckets['19-35'] },
    { name: '36-50', value: demographicBuckets['36-50'] },
    { name: '51+', value: demographicBuckets['51+'] }
  ];

  const averageConsultationMinutes = data.appointments.length
    ? Math.round(
      data.appointments.reduce((sum, appointment) => {
        const start = appointment?.startTime;
        const end = appointment?.endTime;
        if (!start || !end) return sum;
        const [startHour, startMinute] = String(start).split(':').map(Number);
        const [endHour, endMinute] = String(end).split(':').map(Number);
        const startTotal = (startHour * 60) + startMinute;
        const endTotal = (endHour * 60) + endMinute;
        return sum + Math.max(endTotal - startTotal, 0);
      }, 0) / data.appointments.length
    )
    : 0;

  const completedAppointments = data.appointments.filter((appointment) => appointment.status === 'completed').length;
  const successRate = data.appointments.length
    ? Math.round((completedAppointments / data.appointments.length) * 100)
    : 0;

  const quickActions = [
    {
      title: 'View Appointments',
      description: 'Manage your schedule',
      icon: <Calendar className="w-6 h-6" />,
      link: '/appointments',
      color: 'bg-blue-500'
    },
    {
      title: 'Patient Insights',
      description: 'Records and timeline',
      icon: <FileText className="w-6 h-6" />,
      link: '/patient-insights',
      color: 'bg-green-500'
    },
    {
      title: 'Health Predictions',
      description: 'Review AI predictions',
      icon: <Activity className="w-6 h-6" />,
      link: '/health-predictions',
      color: 'bg-purple-500'
    },
    {
      title: 'Priority Queue',
      description: 'View prioritized patients',
      icon: <Clock className="w-6 h-6" />,
      link: '/doctor-queue',
      color: 'bg-red-500'
    }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Today's Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{data.appointments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-white">
              <Users className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Patients</p>
              <p className="text-2xl font-bold text-gray-900">{uniquePatients}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-white">
              <Clock className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Avg. Consultation</p>
              <p className="text-2xl font-bold text-gray-900">{averageConsultationMinutes} min</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center text-white">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">{successRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center text-white`}>
                  {action.icon}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Appointments */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h3>
          <div className="space-y-3">
            {data.appointments.length > 0 ? (
              data.appointments.map((appointment) => (
                <div key={appointment._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{appointment.patientId?.name || 'Patient'}</p>
                      <p className="text-sm text-gray-600">{appointment.startTime} - {appointment.endTime}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                    appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {appointment.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No appointments today</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Prescription added</p>
                <p className="text-sm text-gray-600">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Appointment completed</p>
                <p className="text-sm text-gray-600">5 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Health prediction reviewed</p>
                <p className="text-sm text-gray-600">Yesterday</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthChart
          type="bar"
          data={appointmentTrends}
          title="Weekly Appointments"
        />
        <HealthChart
          type="pie"
          data={patientDemographics}
          title="Patient Age Distribution"
        />
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'ai', label: 'AI Query', icon: <FileText className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Doctor Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Dr. {user?.name}</span>
              <Link
                to="/doctor-profile"
                className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                aria-label="Doctor profile"
                title="Doctor profile"
              >
                <Stethoscope className="w-4 h-4" />
              </Link>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!loading && !data.profile && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-amber-900">Complete your doctor profile</h2>
                <p className="mt-1 text-sm text-amber-800">
                  Your doctor profile is not set up yet. Complete it to unlock full doctor features.
                </p>
              </div>
              <Link to="/doctor-profile">
                <Button size="sm">Complete Profile</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'ai' && <NLPChat />}
          </>
        )}
      </main>
    </div>
  );
};

export default DoctorDashboard;
