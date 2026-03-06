import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Clock, AlertCircle, Package, Users, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { pharmacyAPI, pharmacistAPI } from '../services/api';

const PharmacistQueue = () => {
  const { user, logout } = useAuth();
  const [data, setData] = useState({
    queue: [],
    stats: {}
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
      const [queue, stats] = await Promise.all([
        pharmacyAPI.getQueue(),
        pharmacyAPI.getStats()
      ]);

      const priorityRank = { urgent: 4, high: 3, medium: 2, low: 1 };
      const sortedQueue = [...(queue.data || [])].sort((a, b) => {
        const emergencyDiff = Number(Boolean(b?.emergencyPrePack)) - Number(Boolean(a?.emergencyPrePack));
        if (emergencyDiff !== 0) return emergencyDiff;

        const priorityDiff = (priorityRank[b?.priority] || 0) - (priorityRank[a?.priority] || 0);
        if (priorityDiff !== 0) return priorityDiff;

        return new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime();
      });

      setData({
        queue: sortedQueue,
        stats: stats.data || {}
      });
    } catch (error) {
      console.error('Error loading queue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQueueActionLabel = (status) => {
    switch (status) {
      case 'pending': return 'Assign';
      case 'confirmed': return 'Start Prep';
      case 'preparing': return 'Complete';
      case 'ready': return 'Dispatch';
      case 'completed': return 'Dispatch';
      default: return null;
    }
  };

  const canActOnOrder = (order) => {
    const loggedInId = String(user?._id || user?.id || '');
    const assignedId = String(order?.assignedPharmacist?._id || order?.assignedPharmacist || '');

    // Pending orders can be claimed by current pharmacist.
    if (order?.status === 'pending') {
      return true;
    }

    // For non-pending orders, only assigned pharmacist can process action.
    if (!assignedId) {
      return false;
    }

    return loggedInId && assignedId === loggedInId;
  };

  const handleQueueAction = (order) => {
    const actionType = order.status === 'pending'
      ? 'assign'
      : order.status === 'confirmed'
        ? 'start'
      : order.status === 'preparing'
        ? 'complete'
        : ['ready', 'completed'].includes(order.status)
          ? 'dispatch'
          : null;

    if (!actionType) {
      return;
    }

    setActionModal({
      isOpen: true,
      type: actionType,
      order,
      notes: '',
      qualityCheckPassed: true,
      dispatchType: 'pickup',
      recipientName: order?.patientDetails?.name || order?.patientId?.name || 'Patient',
      recipientPhone: order?.patientDetails?.phone || order?.patientId?.phone || '',
      deliveryPartner: 'Internal Delivery'
    });
  };

  const closeActionModal = () => {
    setActionModal({
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
  };

  const submitAction = async () => {
    if (!actionModal.order) return;

    setOrderActionLoading(prev => ({ ...prev, [actionModal.order._id]: true }));

    try {
      if (actionModal.type === 'assign') {
        await pharmacistAPI.assignOrder(actionModal.order._id);
      } else if (actionModal.type === 'start') {
        await pharmacistAPI.startPreparation(actionModal.order._id);
      } else if (actionModal.type === 'complete') {
        await pharmacistAPI.completePreparation(actionModal.order._id, {
          notes: actionModal.notes,
          qualityCheckPassed: actionModal.qualityCheckPassed
        });
      } else if (actionModal.type === 'dispatch') {
        await pharmacistAPI.dispatchOrder(actionModal.order._id, {
          dispatchType: actionModal.dispatchType,
          recipientName: actionModal.recipientName,
          recipientPhone: actionModal.recipientPhone,
          deliveryPartner: actionModal.deliveryPartner,
          notes: actionModal.notes
        });
      }

      await loadData();
      closeActionModal();
    } catch (error) {
      console.error('Error processing order action:', error);
      const unavailable = Array.isArray(error?.response?.data?.unavailableMedicines)
        ? error.response.data.unavailableMedicines
        : [];
      const unavailableDetails = unavailable.length
        ? `\nUnavailable: ${unavailable.map((m) => `${m.name} (requested ${m.requested}, available ${m.available})`).join(', ')}`
        : '';
      const backendMessage = error?.response?.data?.message || error?.message || 'Failed to process order action. Please try again.';
      alert(`${backendMessage}${unavailableDetails}`);
    } finally {
      setOrderActionLoading(prev => ({ ...prev, [actionModal.order._id]: false }));
    }
  };

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
              <h1 className="text-xl font-semibold text-slate-900">Pharmacy Queue</h1>
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
          {/* Queue Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/95 rounded-xl shadow-sm border border-sky-100 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-linear-to-br from-sky-600 to-cyan-500 rounded-lg flex items-center justify-center text-white shadow-sm">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600">In Queue</p>
                  <p className="text-2xl font-bold text-slate-900">{data.queue.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/95 rounded-xl shadow-sm border border-sky-100 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-linear-to-br from-red-500 to-rose-500 rounded-lg flex items-center justify-center text-white shadow-sm">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600">Urgent Orders</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {data.queue.filter(o => o.priority === 'urgent').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/95 rounded-xl shadow-sm border border-sky-100 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-linear-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center text-white shadow-sm">
                  <Package className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600">Completed Today</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {data.queue.filter(o => o.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/95 rounded-xl shadow-sm border border-sky-100 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-linear-to-br from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center text-white shadow-sm">
                  <Users className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600">Avg. Prep Time</p>
                  <p className="text-2xl font-bold text-slate-900">{data.stats?.averagePrepTime || 0} min</p>
                </div>
              </div>
            </div>
          </div>

          {/* Queue List */}
          <div className="bg-white rounded-xl shadow-sm border border-sky-100 overflow-hidden">
            <div className="p-6 border-b border-sky-100 bg-sky-50/40">
              <h3 className="text-lg font-semibold text-slate-900">Active Queue</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {data.queue.length > 0 ? (
                data.queue.map((order, index) => (
                  <div key={order._id} className="p-4 hover:bg-sky-50/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-lg font-semibold text-slate-900">#{index + 1}</div>
                        <div>
                          <p className="font-semibold text-slate-900">{order.patientDetails?.name || 'Patient'}</p>
                          <p className="text-sm text-slate-600">Order #{order.orderId}</p>
                          <p className="text-xs text-slate-500">
                            {order.medicines?.length || 0} medicines • Est. {order.preparationTime || 0} min
                          </p>
                          {Array.isArray(order?.prescriptionId?.prescriptionFiles) && order.prescriptionId.prescriptionFiles.length > 0 && (
                            <div className="mt-1 text-xs">
                              <p className="font-medium text-slate-700">Uploaded Prescriptions:</p>
                              <div className="space-y-0.5">
                                {order.prescriptionId.prescriptionFiles.slice(0, 2).map((file, fileIndex) => (
                                  <a
                                    key={`${order._id}-prescription-${fileIndex}`}
                                    href={file?.fileUrl || file?.fileData}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block text-sky-700 underline"
                                  >
                                    {file?.title || file?.fileName || `Prescription ${fileIndex + 1}`}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {order.emergencyPrePack && (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-700">
                            Emergency Pre-Pack
                          </span>
                        )}
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getPriorityColor(order.priority)}`}>
                          {order.priority}
                        </span>
                        <span className="px-2.5 py-1 text-xs font-semibold bg-sky-100 text-sky-700 rounded-full">
                          {order.status}
                        </span>
                        {getQueueActionLabel(order.status) && canActOnOrder(order) && (
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
                <div className="p-8 text-center text-slate-500">
                  <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p>No orders in queue</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Modal
        isOpen={actionModal.isOpen}
        onClose={closeActionModal}
        title={
          actionModal.type === 'assign'
            ? 'Assign Order'
            :
          actionModal.type === 'start'
            ? 'Start Preparation'
            : actionModal.type === 'complete'
              ? 'Complete Preparation'
              : 'Dispatch Order'
        }
      >
        <div className="space-y-4">
          {actionModal.type === 'assign' && (
            <p className="text-sm text-slate-700">
              Assign this order to yourself?
            </p>
          )}

          {actionModal.type === 'start' && (
            <p className="text-sm text-slate-700">
              Start preparing this order now?
            </p>
          )}

          {actionModal.type === 'complete' && (
            <>
              <Input
                id="prep-notes"
                label="Preparation Notes"
                value={actionModal.notes}
                onChange={(e) => setActionModal(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any notes about preparation..."
              />
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="quality-check"
                  checked={actionModal.qualityCheckPassed}
                  onChange={(e) => setActionModal(prev => ({ ...prev, qualityCheckPassed: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="quality-check" className="ml-2 text-sm text-gray-900">
                  Quality check passed
                </label>
              </div>
            </>
          )}

          {actionModal.type === 'dispatch' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Type</label>
                  <select
                    value={actionModal.dispatchType}
                    onChange={(e) => setActionModal(prev => ({ ...prev, dispatchType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pickup">Pickup</option>
                    <option value="delivery">Delivery</option>
                  </select>
                </div>
                {actionModal.dispatchType === 'delivery' && (
                  <>
                    <div>
                      <Input
                        id="recipient-name"
                        label="Recipient Name"
                        value={actionModal.recipientName}
                        onChange={(e) => setActionModal(prev => ({ ...prev, recipientName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Input
                        id="recipient-phone"
                        label="Recipient Phone"
                        value={actionModal.recipientPhone}
                        onChange={(e) => setActionModal(prev => ({ ...prev, recipientPhone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Partner</label>
                      <select
                        value={actionModal.deliveryPartner}
                        onChange={(e) => setActionModal(prev => ({ ...prev, deliveryPartner: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Internal Delivery">Internal Delivery</option>
                        <option value="External Partner">External Partner</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
              <Input
                id="dispatch-notes"
                label="Dispatch Notes"
                value={actionModal.notes}
                onChange={(e) => setActionModal(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any notes about dispatch..."
              />
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={closeActionModal}>
              Cancel
            </Button>
            <Button onClick={submitAction}>
              {actionModal.type === 'assign'
                ? 'Assign Order'
                : actionModal.type === 'start'
                  ? 'Start Preparation'
                  : actionModal.type === 'complete'
                    ? 'Complete Preparation'
                    : 'Dispatch Order'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PharmacistQueue;