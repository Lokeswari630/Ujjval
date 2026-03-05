import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Pill, Clock, AlertCircle, TrendingUp, Package, Users, Activity } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import HealthChart from '../components/charts/HealthChart';
import { pharmacyAPI, pharmacistAPI } from '../services/api';

const PharmacistDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('queue');
  const [data, setData] = useState({
    queue: [],
    stats: {},
    lowStock: []
  });
  const [loading, setLoading] = useState(true);
  const [orderActionLoading, setOrderActionLoading] = useState({});
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: null,
    order: null,
    notes: '',
    qualityCheckPassed: true,
    dispatchType: 'pickup',
    recipientName: '',
    recipientPhone: '',
    deliveryPartner: 'Internal Delivery'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashboard, queue, stats, lowStockInventory] = await Promise.all([
        pharmacistAPI.getDashboard(),
        pharmacyAPI.getQueue(),
        pharmacyAPI.getStats(),
        pharmacistAPI.getInventory({ lowStock: true })
      ]);

      const lowStockFromDashboard = dashboard?.data?.lowStockAlerts || [];
      const lowStockFromInventory = lowStockInventory?.data?.medicines?.map((med) => ({
        id: med._id,
        name: med.name,
        stock: med.stock,
        minLevel: med.minStockLevel
      })) || [];

      const lowStockByName = new Map(lowStockFromInventory.map((item) => [item.name?.toLowerCase(), item]));
      const mergedLowStock = (lowStockFromDashboard.length ? lowStockFromDashboard : lowStockFromInventory).map((item) => {
        const inventoryMatch = lowStockByName.get(item.name?.toLowerCase());
        return {
          ...item,
          id: item.id || inventoryMatch?.id,
          minLevel: item.minLevel || inventoryMatch?.minLevel
        };
      });

      setData({
        queue: dashboard?.data?.priorityQueue?.queue || queue.data || dashboard?.data?.assignedOrders || [],
        stats: stats.data || dashboard?.data?.stats || {},
        lowStock: mergedLowStock
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = async (item) => {
    if (!item?.id) {
      alert('Inventory item ID is missing for this medicine. Open inventory list and restock there.');
      return;
    }

    const quantityInput = window.prompt(`Add stock quantity for ${item.name}:`, '10');
    if (!quantityInput) return;

    const quantity = Number(quantityInput);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      alert('Please enter a valid positive number.');
      return;
    }

    try {
      await pharmacistAPI.updateInventoryStock(item.id, {
        quantity,
        operation: 'add',
        reason: 'Manual restock from dashboard'
      });
      await loadData();
    } catch (error) {
      console.error('Restock failed:', error);
      alert(error?.message || 'Failed to restock medicine.');
    }
  };

  const withOrderAction = async (orderId, action) => {
    setOrderActionLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      await action();
      await loadData();
    } catch (error) {
      console.error('Order action failed:', error);
      alert(error?.message || 'Order action failed.');
    } finally {
      setOrderActionLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleQueueAction = async (order) => {
    if (!order?._id) return;

    if (order.status === 'pending') {
      return withOrderAction(order._id, () => pharmacistAPI.assignOrder(order._id));
    }

    if (order.status === 'confirmed') {
      return withOrderAction(order._id, () => pharmacistAPI.startPreparation(order._id));
    }

    if (order.status === 'preparing') {
      setActionModal({
        isOpen: true,
        type: 'complete',
        order,
        notes: '',
        qualityCheckPassed: true,
        dispatchType: 'pickup',
        recipientName: '',
        recipientPhone: '',
        deliveryPartner: 'Internal Delivery'
      });
      return;
    }

    if (order.status === 'ready') {
      setActionModal({
        isOpen: true,
        type: 'dispatch',
        order,
        notes: '',
        qualityCheckPassed: true,
        dispatchType: 'pickup',
        recipientName: order.patientDetails?.name || 'Patient',
        recipientPhone: order.patientDetails?.phone || '',
        deliveryPartner: 'Internal Delivery'
      });
    }
  };

  const closeActionModal = () => {
    setActionModal((prev) => ({ ...prev, isOpen: false }));
  };

  const submitActionModal = async () => {
    const order = actionModal.order;
    if (!order?._id) return;

    if (actionModal.type === 'complete') {
      await withOrderAction(order._id, () => pharmacistAPI.completePreparation(order._id, {
        notes: actionModal.notes,
        qualityCheckPassed: actionModal.qualityCheckPassed
      }));
      closeActionModal();
      return;
    }

    if (actionModal.type === 'dispatch') {
      if (!actionModal.recipientName?.trim() || !actionModal.recipientPhone?.trim()) {
        alert('Recipient name and phone are required.');
        return;
      }

      await withOrderAction(order._id, () => pharmacistAPI.dispatchOrder(order._id, {
        dispatchType: actionModal.dispatchType,
        recipientName: actionModal.recipientName.trim(),
        recipientPhone: actionModal.recipientPhone.trim(),
        deliveryPartner: actionModal.dispatchType === 'delivery'
          ? actionModal.deliveryPartner?.trim() || 'Internal Delivery'
          : undefined
      }));
      closeActionModal();
    }
  };

  const getQueueActionLabel = (status) => {
    if (status === 'pending') return 'Assign';
    if (status === 'confirmed') return 'Start';
    if (status === 'preparing') return 'Complete';
    if (status === 'ready') return 'Dispatch';
    return null;
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

  const quickActions = [
    {
      title: 'View Queue',
      description: 'Manage pharmacy queue',
      icon: <Clock className="w-6 h-6" />,
      tab: 'queue',
      color: 'bg-blue-500'
    },
    {
      title: 'Inventory',
      description: 'Manage stock levels',
      icon: <Package className="w-6 h-6" />,
      tab: 'inventory',
      color: 'bg-green-500'
    },
    {
      title: 'Order History',
      description: 'View past orders',
      icon: <Activity className="w-6 h-6" />,
      tab: 'queue',
      color: 'bg-purple-500'
    },
    {
      title: 'Reports',
      description: 'Analytics & reports',
      icon: <TrendingUp className="w-6 h-6" />,
      tab: 'analytics',
      color: 'bg-orange-500'
    }
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderQueue = () => (
    <div className="space-y-6">
      {/* Queue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white">
              <Clock className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">In Queue</p>
              <p className="text-2xl font-bold text-gray-900">{data.queue.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center text-white">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Urgent Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.queue.filter(o => o.priority === 'urgent').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-white">
              <Package className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Ready Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.queue.filter(o => o.status === 'ready').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-white">
              <Users className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Avg. Prep Time</p>
              <p className="text-2xl font-bold text-gray-900">{data.stats?.averagePrepTime || 0} min</p>
            </div>
          </div>
        </div>
      </div>

      {/* Queue List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Active Queue</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {data.queue.length > 0 ? (
            data.queue.map((order, index) => (
              <div key={order._id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-lg font-medium text-gray-900">#{index + 1}</div>
                    <div>
                      <p className="font-medium text-gray-900">{order.patientDetails?.name || 'Patient'}</p>
                      <p className="text-sm text-gray-600">Order #{order.orderId}</p>
                      <p className="text-xs text-gray-500">
                        {order.medicines?.length || 0} medicines • Est. {order.preparationTime || 0} min
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(order.priority)}`}>
                      {order.priority}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {order.status}
                    </span>
                    {getQueueActionLabel(order.status) && (
                      <Button
                        size="sm"
                        onClick={() => handleQueueAction(order)}
                        disabled={!!orderActionLoading[order._id]}
                      >
                        {orderActionLoading[order._id] ? '...' : getQueueActionLabel(order.status)}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p>No orders in queue</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-6">
      {/* Low Stock Alerts */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {data.lowStock.length > 0 ? (
            data.lowStock.map((item, index) => (
              <div key={index} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">
                      Current: {item.stock} | Minimum: {item.minLevel}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      Low Stock
                    </span>
                    <Button size="sm" onClick={() => handleRestock(item)}>Restock</Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p>All medicines are in stock</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthChart
          type="bar"
          data={orderTrends}
          title="Weekly Order Trends"
        />
        <HealthChart
          type="pie"
          data={priorityDistribution}
          title="Priority Distribution"
        />
      </div>
    </div>
  );

  const tabs = [
    { id: 'queue', label: 'Queue', icon: <Clock className="w-4 h-4" /> },
    { id: 'inventory', label: 'Inventory', icon: <Package className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Pharmacist Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Pharmacist {user?.name}</span>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(action.tab)}
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
              </button>
            ))}
          </div>
        </div>

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
            {activeTab === 'queue' && renderQueue()}
            {activeTab === 'inventory' && renderInventory()}
            {activeTab === 'analytics' && renderAnalytics()}
          </>
        )}
      </main>

      <Modal
        isOpen={actionModal.isOpen}
        onClose={closeActionModal}
        title={actionModal.type === 'complete' ? 'Complete Preparation' : 'Dispatch Order'}
      >
        <div className="space-y-4">
          {actionModal.type === 'complete' && (
            <>
              <Input
                id="prep-notes"
                label="Preparation Notes"
                value={actionModal.notes}
                onChange={(e) => setActionModal((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes"
              />
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={actionModal.qualityCheckPassed}
                  onChange={(e) => setActionModal((prev) => ({ ...prev, qualityCheckPassed: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Quality check passed</span>
              </label>
            </>
          )}

          {actionModal.type === 'dispatch' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Type</label>
                <select
                  value={actionModal.dispatchType}
                  onChange={(e) => setActionModal((prev) => ({ ...prev, dispatchType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pickup">Pickup</option>
                  <option value="delivery">Delivery</option>
                </select>
              </div>

              <Input
                id="recipient-name"
                label="Recipient Name"
                value={actionModal.recipientName}
                onChange={(e) => setActionModal((prev) => ({ ...prev, recipientName: e.target.value }))}
                placeholder="Enter recipient name"
              />

              <Input
                id="recipient-phone"
                label="Recipient Phone"
                value={actionModal.recipientPhone}
                onChange={(e) => setActionModal((prev) => ({ ...prev, recipientPhone: e.target.value }))}
                placeholder="Enter recipient phone"
              />

              {actionModal.dispatchType === 'delivery' && (
                <Input
                  id="delivery-partner"
                  label="Delivery Partner"
                  value={actionModal.deliveryPartner}
                  onChange={(e) => setActionModal((prev) => ({ ...prev, deliveryPartner: e.target.value }))}
                  placeholder="Internal Delivery"
                />
              )}
            </>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" onClick={closeActionModal}>Cancel</Button>
            <Button onClick={submitActionModal}>Submit</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PharmacistDashboard;
