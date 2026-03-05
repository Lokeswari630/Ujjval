import { Link } from 'react-router-dom';

const Dashboard = () => {
  // Mock user data - will come from authentication context later
  const user = {
    name: 'John Doe',
    role: 'patient',
    email: 'john.doe@example.com'
  };

  const stats = [
    { label: 'Appointments', value: '3', color: 'bg-blue-500' },
    { label: 'Prescriptions', value: '2', color: 'bg-green-500' },
    { label: 'Health Reports', value: '5', color: 'bg-purple-500' },
    { label: 'Messages', value: '1', color: 'bg-orange-500' }
  ];

  const quickActions = [
    { title: 'Book Appointment', description: 'Schedule with a doctor', icon: '📅', link: '/appointments' },
    { title: 'Health Prediction', description: 'AI health risk analysis', icon: '🤖', link: '/health-prediction' },
    { title: 'Medicine Status', description: 'Track your prescriptions', icon: '💊', link: '/pharmacy' },
    { title: 'Find Doctors', description: 'Browse specialists', icon: '👨‍⚕️', link: '/doctors' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">CarePulse</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.name}</span>
              <button className="btn-secondary text-sm">Logout</button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="card">
              <div className="flex items-center">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-white text-xl font-bold`}>
                  {stat.value}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.link}
                className="card hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-4xl mb-3">{action.icon}</div>
                  <h3 className="font-medium text-gray-900 mb-1">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="card">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">Appointment with Dr. Smith</p>
                  <p className="text-sm text-gray-600">Tomorrow at 10:00 AM</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  Upcoming
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">Prescription Ready</p>
                  <p className="text-sm text-gray-600">Amoxicillin - 500mg</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  Ready
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">Health Risk Analysis</p>
                  <p className="text-sm text-gray-600">Low risk detected</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                  Completed
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
