import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Hospital, Clock, AlertCircle, TrendingUp, Package, Users, Activity, PlusCircle, 
  CheckCircle2, BarChart3, PieChart, TrendingDown, Zap, Target, 
  ShoppingCart, FileText, Settings, Bell, Calendar, ArrowUp, ArrowDown,
  DollarSign, Users2, Timer, PackageOpen, AlertTriangle
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import HealthChart from '../components/charts/HealthChart';
import NLPChat from '../components/chat/NLPChat';
import { pharmacistAPI } from '../services/api';

const PharmacistDashboard = () => {
  const { user, logout } = useAuth();
  const [statsTab, setStatsTab] = useState('overview');
  const [orderViewFilter, setOrderViewFilter] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [quickDeltas, setQuickDeltas] = useState({
    queue: null,
    lowStock: null,
    inventory: null,
    totalOrders: null
  });
  const hasInitializedRef = useRef(false);
  const previousCountsRef = useRef({
    queue: 0,
    lowStock: 0,
    inventory: 0,
    totalOrders: 0
  });
  const [data, setData] = useState({
    queue: [],
    assignedOrders: [],
    stats: {},
    lowStock: [],
    inventoryCount: 0
  });

  const loadData = async () => {
    try {
      const [dashboard, lowStockInventory] = await Promise.all([
        pharmacistAPI.getDashboard(),
        pharmacistAPI.getInventory({ lowStock: true })
      ]);

      const lowStockFromDashboard = dashboard?.data?.lowStockAlerts || [];
      const lowStockFromInventory = lowStockInventory?.data?.medicines?.map((med) => ({
        id: med._id,
        name: med.name,
        stock: med.stock,
        minLevel: med.minStockLevel
      })) || [];
      const totalInventoryCount = Number(lowStockInventory?.data?.summary?.totalMedicines || 0);

      const lowStockByName = new Map(lowStockFromInventory.map((item) => [item.name?.toLowerCase(), item]));
      const mergedLowStock = (lowStockFromDashboard.length ? lowStockFromDashboard : lowStockFromInventory).map((item) => {
        const inventoryMatch = lowStockByName.get(item.name?.toLowerCase());
        return {
          ...item,
          id: item.id || inventoryMatch?.id,
          minLevel: item.minLevel || inventoryMatch?.minLevel
        };
      });

      const pharmacistStats = dashboard?.data?.stats || {};
      const assignedOrders = Array.isArray(dashboard?.data?.assignedOrders)
        ? dashboard.data.assignedOrders
        : [];
      const completedFromAssigned = assignedOrders.filter((order) => ['completed', 'delivered'].includes(String(order?.status || '').toLowerCase())).length;
      const totalFromAssigned = assignedOrders.length;
      const avgPrepFromAssigned = totalFromAssigned > 0
        ? Math.round(assignedOrders.reduce((sum, order) => sum + Number(order?.preparationTime || 0), 0) / totalFromAssigned)
        : 0;
      const revenueFromAssigned = assignedOrders
        .filter((order) => ['completed', 'delivered'].includes(String(order?.status || '').toLowerCase()))
        .reduce((sum, order) => sum + Number(order?.finalAmount || 0), 0);

      const normalizedStats = {
        totalOrders: Number(pharmacistStats.totalOrders || totalFromAssigned || 0),
        completedOrders: Number(pharmacistStats.completedOrders || completedFromAssigned || 0),
        averagePrepTime: Number(pharmacistStats.averagePrepTime || avgPrepFromAssigned || 0),
        revenue: Number(pharmacistStats.revenue ?? pharmacistStats.totalRevenue ?? revenueFromAssigned ?? 0),
        priorityDistribution: pharmacistStats.priorityDistribution || { urgent: 0, high: 0, medium: 0, low: 0 }
      };

      const activeStatuses = new Set(['pending', 'confirmed', 'preparing', 'ready', 'completed']);
      const activeOrders = assignedOrders.filter((order) => activeStatuses.has(String(order?.status || '').toLowerCase()));

      const nextCounts = {
        queue: activeOrders.length,
        lowStock: mergedLowStock.length,
        inventory: totalInventoryCount,
        totalOrders: Number(normalizedStats.totalOrders || 0)
      };

      if (hasInitializedRef.current) {
        setQuickDeltas({
          queue: nextCounts.queue - previousCountsRef.current.queue,
          lowStock: nextCounts.lowStock - previousCountsRef.current.lowStock,
          inventory: nextCounts.inventory - previousCountsRef.current.inventory,
          totalOrders: nextCounts.totalOrders - previousCountsRef.current.totalOrders
        });
      }

      previousCountsRef.current = nextCounts;
      hasInitializedRef.current = true;

      setData({
        // Dashboard counters and lists should reflect this pharmacist's workload only.
        queue: activeOrders,
        assignedOrders,
        stats: normalizedStats,
        lowStock: mergedLowStock,
        inventoryCount: totalInventoryCount
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    loadData();

    const refreshTimer = window.setInterval(() => {
      loadData();
    }, 20000);

    const onFocus = () => loadData();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const formatQuickTrend = (delta, label) => {
    if (delta === null || Number.isNaN(delta)) {
      return `Live ${label}`;
    }
    if (delta === 0) {
      return `No change (${label})`;
    }
    return `${delta > 0 ? '+' : ''}${delta} ${label}`;
  };

  const historicalOrders = (Array.isArray(data.assignedOrders) ? data.assignedOrders : []).filter((order) =>
    ['dispatched', 'delivered'].includes(String(order?.status || '').toLowerCase())
  );

  const allAssignedOrders = Array.isArray(data.assignedOrders) ? data.assignedOrders : [];

  const quickActions = [
    {
      title: 'Queue Management',
      description: 'Process orders',
      icon: <Clock className="w-6 h-6" />,
      path: '/pharmacist/queue',
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      count: data.queue.length,
      trend: formatQuickTrend(quickDeltas.queue, 'since refresh')
    },
    {
      title: 'Inventory',
      description: 'Total medicines',
      icon: <Package className="w-6 h-6" />,
      path: '/pharmacist/inventory',
      color: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      count: data.inventoryCount || 0,
      trend: formatQuickTrend(quickDeltas.inventory, 'since refresh')
    },
    {
      title: 'Analytics',
      description: 'Reports & insights',
      icon: <BarChart3 className="w-6 h-6" />,
      path: '/pharmacist/analytics',
      color: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      count: data.stats?.totalOrders || 0,
      trend: formatQuickTrend(quickDeltas.totalOrders, 'since refresh')
    },
    {
      title: 'AI Assistant',
      description: 'Smart help',
      icon: <Zap className="w-6 h-6" />,
      path: '/pharmacist/ai',
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      count: '24/7',
      trend: lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Live'
    }
  ];

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${(data.stats?.revenue || 0).toLocaleString()}`,
      icon: <DollarSign className="w-8 h-8" />,
      color: 'from-blue-500 to-blue-600',
      trend: '+12.5%',
      trendUp: true
    },
    {
      title: 'Orders Processed',
      value: data.stats?.totalOrders || 0,
      icon: <ShoppingCart className="w-8 h-8" />,
      color: 'from-emerald-500 to-emerald-600',
      trend: '+8.2%',
      trendUp: true
    },
    {
      title: 'Completion Rate',
      value: `${data.stats?.totalOrders > 0 ? Math.round((data.stats?.completedOrders / data.stats?.totalOrders) * 100) : 0}%`,
      icon: <Target className="w-8 h-8" />,
      color: 'from-indigo-500 to-indigo-600',
      trend: '+3.1%',
      trendUp: true
    },
    {
      title: 'Avg. Processing Time',
      value: `${data.stats?.averagePrepTime || 0}m`,
      icon: <Timer className="w-8 h-8" />,
      color: 'from-amber-500 to-amber-600',
      trend: '-15.3%',
      trendUp: false
    }
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-50/60 via-white to-slate-100/60">
      {/* Enhanced Header */}
      <header className="backdrop-blur bg-white/90 shadow-sm border-b border-sky-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-linear-to-br from-sky-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-md shadow-sky-200/60">
                  <Hospital className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Pharmacy Dashboard</h1>
                  <p className="text-xs text-slate-500">Operational Command Center</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Bell className="w-6 h-6 text-slate-500 hover:text-sky-700 cursor-pointer transition-colors" />
                {data.lowStock?.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </div>
              <Link
                to="/pharmacist/profile"
                className="flex items-center gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-sky-50"
                aria-label="Open pharmacist profile"
              >
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                  <p className="text-xs text-slate-500">Pharmacist</p>
                </div>
                <div className="w-10 h-10 bg-linear-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center border border-slate-200">
                  <Users className="w-5 h-5 text-slate-600" />
                </div>
              </Link>
              <Button variant="outline" onClick={logout} className="text-sm">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 bg-linear-to-r from-sky-700 via-sky-600 to-cyan-600 rounded-2xl p-8 text-white shadow-lg shadow-sky-300/40 border border-sky-300/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h2>
              <p className="text-sky-100 text-lg">Here is your pharmacy overview for today</p>
              <div className="flex items-center space-x-4 mt-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span className="text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold opacity-20">
                <Package className="w-24 h-24" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => (
            <div key={index} className="bg-white/95 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-sky-100 hover:border-sky-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-linear-to-br ${card.color} rounded-lg flex items-center justify-center text-white`}>
                  {card.icon}
                </div>
                <div className={`flex items-center space-x-1 text-sm font-semibold ${
                  card.trendUp ? 'text-green-600' : 'text-red-600'
                }`}>
                  {card.trendUp ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  <span>{card.trend}</span>
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="text-sm text-slate-600">{card.title}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
            <Zap className="w-6 h-6 mr-2 text-yellow-500" />
            Quick Actions
          </h3>
          {lastUpdated && (
            <p className="-mt-4 mb-4 text-xs text-slate-500">
              Auto-refresh every 20s. Last updated at {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.path}
                className="group bg-white/95 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-sky-100 hover:border-sky-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-14 h-14 ${action.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                    {action.icon}
                  </div>
                  {action.count !== undefined && (
                    <span className="text-2xl font-bold text-slate-900">{action.count}</span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">{action.title}</h4>
                  <p className="text-sm text-slate-600">{action.description}</p>
                  {action.trend && (
                    <div className="flex items-center space-x-1 mt-2">
                      <span className="text-xs font-semibold text-sky-700">{action.trend}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Advanced Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Priority Orders */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-sky-100 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
              Priority Orders
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-900">Urgent</p>
                    <p className="text-2xl font-bold text-red-600">
                      {data.queue.filter(o => o.priority === 'urgent').length}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-900">High</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {data.queue.filter(o => o.priority === 'high').length}
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-orange-500" />
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Medium</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {data.queue.filter(o => o.priority === 'medium').length}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-900">Low</p>
                    <p className="text-2xl font-bold text-green-600">
                      {data.queue.filter(o => o.priority === 'low').length}
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Low Stock Alert */}
          <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
              <PackageOpen className="w-5 h-5 mr-2 text-yellow-500" />
              Inventory Alerts
            </h3>
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Low Stock Medicines</p>
                  <p className="text-xs text-slate-600">Showing name and current units available</p>
                </div>
                <span className="text-3xl font-bold text-amber-600">{data.lowStock?.length || 0}</span>
              </div>
              {data.lowStock && data.lowStock.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-700">Top low stock items:</p>
                  {data.lowStock.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-amber-100">
                      <span className="text-xs text-slate-700">{item.name}</span>
                      <span className="text-xs font-bold text-red-600">
                        {item.stock} units (min {item.minLevel})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Link 
              to="/pharmacist/inventory"
              className="mt-4 inline-flex w-full items-center justify-center bg-sky-600 text-white text-center py-2 rounded-lg hover:bg-sky-700 transition-colors text-sm font-semibold"
            >
              Manage Inventory
            </Link>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" />
            Performance Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Timer className="w-8 h-8 text-indigo-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{data.stats?.averagePrepTime || 0}</p>
              <p className="text-sm text-slate-600">Avg. Processing Time (min)</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users2 className="w-8 h-8 text-sky-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{data.queue.length}</p>
              <p className="text-sm text-slate-600">Active Orders in Queue</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {data.queue.filter(o => ['completed', 'delivered'].includes(o.status)).length}
              </p>
              <p className="text-sm text-slate-600">Completed Orders</p>
            </div>
          </div>
        </div>

        <section className="bg-white rounded-xl shadow-sm border border-sky-100 p-4 mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Order View</h3>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setOrderViewFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${orderViewFilter === 'all' ? 'bg-sky-100 text-sky-800' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                All ({allAssignedOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setOrderViewFilter('active')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${orderViewFilter === 'active' ? 'bg-sky-100 text-sky-800' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Active ({data.queue.length})
              </button>
              <button
                type="button"
                onClick={() => setOrderViewFilter('history')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${orderViewFilter === 'history' ? 'bg-sky-100 text-sky-800' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                History ({historicalOrders.length})
              </button>
            </div>
          </div>
        </section>

        {/* Assigned Orders List */}
        {(orderViewFilter === 'all' || orderViewFilter === 'active') && (
        <section className="bg-white rounded-xl shadow-sm border border-sky-100 p-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">My Active Assigned Orders</h3>
            <Link to="/pharmacist/queue" className="text-sm text-sky-700 hover:text-sky-900 underline">
              Open Full Queue
            </Link>
          </div>

          {Array.isArray(data.queue) && data.queue.length > 0 ? (
            <div className="space-y-3">
              {data.queue.slice(0, 6).map((order) => (
                <div key={order._id} className="rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{order?.patientDetails?.name || order?.patientId?.name || 'Patient'}</p>
                    <p className="text-xs text-slate-600">Order ID: {order?.orderId || '-'}</p>
                    <p className="text-xs text-slate-600">Medicines: {Array.isArray(order?.medicines) ? order.medicines.length : 0}</p>
                    {Array.isArray(order?.prescriptionId?.prescriptionFiles) && order.prescriptionId.prescriptionFiles.length > 0 && (
                      <div className="mt-1 text-xs">
                        <p className="font-medium text-slate-700">Uploaded Prescriptions:</p>
                        {order.prescriptionId.prescriptionFiles.slice(0, 1).map((file, fileIndex) => (
                          <a
                            key={`${order._id}-dash-prescription-${fileIndex}`}
                            href={file?.fileUrl || file?.fileData}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-sky-700 underline"
                          >
                            {file?.title || file?.fileName || `Prescription ${fileIndex + 1}`}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {order?.emergencyPrePack && (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                        Emergency Pre-Pack
                      </span>
                    )}
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">
                      {order?.status || 'pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No active assigned orders right now.</p>
          )}
        </section>
        )}

        {(orderViewFilter === 'all' || orderViewFilter === 'history') && (
        <section className="bg-white rounded-xl shadow-sm border border-sky-100 p-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Completed Order History</h3>
            <span className="text-sm text-slate-500">{historicalOrders.length} records</span>
          </div>

          {historicalOrders.length > 0 ? (
            <div className="space-y-3">
              {historicalOrders.slice(0, 6).map((order) => (
                <div key={`history-${order._id}`} className="rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{order?.patientDetails?.name || order?.patientId?.name || 'Patient'}</p>
                    <p className="text-xs text-slate-600">Order ID: {order?.orderId || '-'}</p>
                    <p className="text-xs text-slate-600">Updated: {order?.updatedAt ? new Date(order.updatedAt).toLocaleString() : '-'}</p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                    {order?.status || 'delivered'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No completed history yet.</p>
          )}
        </section>
        )}
      </main>
    </div>
  );
};

export default PharmacistDashboard;