import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { appointmentsAPI, doctorsAPI, priorityAPI } from '../services/api';

const initialPrescription = {
  medicineName: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: ''
};

const DoctorQueue = () => {
  const [queueData, setQueueData] = useState(null);
  const [doctorId, setDoctorId] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [error, setError] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [prescription, setPrescription] = useState(initialPrescription);

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError('');

      let currentDoctorId = doctorId;
      if (!currentDoctorId) {
        const profileResponse = await doctorsAPI.getProfile();
        currentDoctorId = profileResponse?.data?._id || '';
        setDoctorId(currentDoctorId);
      }

      if (!currentDoctorId) {
        setQueueData({ queue: [], summary: { total: 0, byPriority: { urgent: 0, high: 0, medium: 0, low: 0 } } });
        return;
      }

      const response = await priorityAPI.getDoctorQueue(currentDoctorId);
      setQueueData(response?.data || null);
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load prioritized queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const summary = useMemo(() => {
    const empty = { total: 0, byPriority: { urgent: 0, high: 0, medium: 0, low: 0 }, averageWaitTime: 0 };
    return queueData?.summary || empty;
  }, [queueData]);

  const handleStartConsultation = async (item) => {
    try {
      setActionLoadingId(item.appointmentId);
      setError('');
      const response = await appointmentsAPI.startVideoConsultation(item.appointmentId);
      const link = response?.data?.videoCallLink;
      if (link) {
        window.open(link, '_blank', 'noopener,noreferrer');
      }
      await loadQueue();
    } catch (actionError) {
      setError(actionError?.message || 'Failed to start video consultation');
    } finally {
      setActionLoadingId('');
    }
  };

  const openPrescriptionModal = (item) => {
    setSelectedAppointmentId(item.appointmentId);
    setSelectedPatientName(item.patientName || 'Patient');
    setPrescription(initialPrescription);
  };

  const closePrescriptionModal = () => {
    setSelectedAppointmentId('');
    setSelectedPatientName('');
    setPrescription(initialPrescription);
  };

  const submitPrescription = async (event) => {
    event.preventDefault();

    if (!selectedAppointmentId) return;

    try {
      setActionLoadingId(selectedAppointmentId);
      setError('');

      await appointmentsAPI.addPrescription(selectedAppointmentId, {
        medicines: [
          {
            name: prescription.medicineName.trim(),
            dosage: prescription.dosage.trim() || 'As prescribed',
            frequency: prescription.frequency.trim() || 'Twice daily',
            duration: prescription.duration.trim() || '5 days',
            instructions: prescription.instructions.trim()
          }
        ],
        instructions: prescription.instructions.trim()
      });

      closePrescriptionModal();
    } catch (submitError) {
      setError(submitError?.message || 'Failed to upload prescription');
    } finally {
      setActionLoadingId('');
    }
  };

  const getPriorityBadge = (priority) => {
    if (priority === 'urgent') return 'bg-red-100 text-red-700';
    if (priority === 'high') return 'bg-amber-100 text-amber-700';
    if (priority === 'medium') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Prioritized Patient Queue</h1>
            <p className="text-sm text-gray-600">Priority-based consultation order for today</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadQueue}>Refresh Queue</Button>
            <Link to="/doctor">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-semibold text-gray-900">{summary.total || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Urgent</p>
            <p className="text-2xl font-semibold text-red-700">{summary.byPriority?.urgent || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">High</p>
            <p className="text-2xl font-semibold text-amber-700">{summary.byPriority?.high || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Medium</p>
            <p className="text-2xl font-semibold text-blue-700">{summary.byPriority?.medium || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Avg Wait</p>
            <p className="text-2xl font-semibold text-gray-900">{summary.averageWaitTime || 0}m</p>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-gray-600">Loading queue...</div>
          ) : (queueData?.queue || []).length === 0 ? (
            <div className="p-6 text-sm text-gray-600">No queued appointments for today.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-2 text-left">Pos</th>
                    <th className="px-4 py-2 text-left">Patient</th>
                    <th className="px-4 py-2 text-left">Time</th>
                    <th className="px-4 py-2 text-left">Priority</th>
                    <th className="px-4 py-2 text-left">Score</th>
                    <th className="px-4 py-2 text-left">Wait</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queueData.queue.map((item) => (
                    <tr key={item.appointmentId} className="border-t border-gray-100">
                      <td className="px-4 py-2 font-semibold text-gray-900">#{item.queuePosition}</td>
                      <td className="px-4 py-2 text-gray-900">{item.patientName}</td>
                      <td className="px-4 py-2 text-gray-700">{item.startTime}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(item.priority)}`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-700">{item.priorityScore}</td>
                      <td className="px-4 py-2 text-gray-700">{item.estimatedWaitTime} min</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleStartConsultation(item)}
                            disabled={actionLoadingId === item.appointmentId}
                          >
                            {actionLoadingId === item.appointmentId ? 'Starting...' : 'Start Video'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPrescriptionModal(item)}
                          >
                            Upload Prescription
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <Modal
        isOpen={Boolean(selectedAppointmentId)}
        onClose={closePrescriptionModal}
        title={`Upload Prescription for ${selectedPatientName}`}
      >
        <form onSubmit={submitPrescription} className="space-y-3">
          <input
            value={prescription.medicineName}
            onChange={(event) => setPrescription((prev) => ({ ...prev, medicineName: event.target.value }))}
            placeholder="Medicine name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={prescription.dosage}
              onChange={(event) => setPrescription((prev) => ({ ...prev, dosage: event.target.value }))}
              placeholder="Dosage"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={prescription.frequency}
              onChange={(event) => setPrescription((prev) => ({ ...prev, frequency: event.target.value }))}
              placeholder="Frequency"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={prescription.duration}
              onChange={(event) => setPrescription((prev) => ({ ...prev, duration: event.target.value }))}
              placeholder="Duration"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <textarea
            value={prescription.instructions}
            onChange={(event) => setPrescription((prev) => ({ ...prev, instructions: event.target.value }))}
            placeholder="Instructions"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closePrescriptionModal}>Cancel</Button>
            <Button type="submit" disabled={actionLoadingId === selectedAppointmentId}>
              {actionLoadingId === selectedAppointmentId ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DoctorQueue;
