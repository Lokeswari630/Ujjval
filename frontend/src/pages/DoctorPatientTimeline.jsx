import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { appointmentsAPI, healthPredictionAPI, monitoringAPI } from '../services/api';

const DoctorPatientTimeline = () => {
  const [appointments, setAppointments] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [error, setError] = useState('');
  const [vitalsChart, setVitalsChart] = useState([]);

  useEffect(() => {
    const loadBaseData = async () => {
      try {
        setTimelineLoading(true);
        setError('');

        const [appointmentsResponse, predictionsResponse] = await Promise.all([
          appointmentsAPI.getAll({ limit: 100 }),
          healthPredictionAPI.getDoctorPatientsPredictions({ limit: 100 })
        ]);

        const appointmentRows = appointmentsResponse?.data || [];
        const predictionRows = predictionsResponse?.data || [];

        setAppointments(appointmentRows);
        setPredictions(predictionRows);

        const firstPatient = appointmentRows.find((item) => item?.patientId?._id)?.patientId;
        if (firstPatient?._id) {
          setSelectedPatientId(firstPatient._id);
          setSelectedPatientName(firstPatient.name || 'Patient');
        }
      } catch (loadError) {
        setError(loadError?.message || 'Failed to load patient timeline data');
      } finally {
        setTimelineLoading(false);
      }
    };

    loadBaseData();
  }, []);

  useEffect(() => {
    const loadVitals = async () => {
      if (!selectedPatientId) {
        setVitalsChart([]);
        return;
      }

      try {
        setVitalsLoading(true);
        const vitalsResponse = await monitoringAPI.getTrends(30, selectedPatientId);
        setVitalsChart(vitalsResponse?.data?.chart || []);
      } catch {
        setVitalsChart([]);
      } finally {
        setVitalsLoading(false);
      }
    };

    loadVitals();
  }, [selectedPatientId]);

  const patients = useMemo(() => {
    const map = new Map();

    appointments.forEach((item) => {
      const patient = item?.patientId;
      if (!patient?._id) return;
      if (!map.has(patient._id)) {
        map.set(patient._id, {
          _id: patient._id,
          name: patient.name || 'Patient'
        });
      }
    });

    return Array.from(map.values());
  }, [appointments]);

  const timelineItems = useMemo(() => {
    if (!selectedPatientId) return [];

    const appointmentEvents = appointments
      .filter((item) => item?.patientId?._id === selectedPatientId)
      .map((item) => ({
        id: `appointment-${item._id}`,
        type: 'appointment',
        date: item?.date ? new Date(item.date) : new Date(),
        title: `Appointment • ${item.status}`,
        detail: `${item.startTime} - ${item.endTime} • ${item.type}`
      }));

    const predictionEvents = predictions
      .filter((item) => item?.patientId?._id === selectedPatientId)
      .map((item) => ({
        id: `prediction-${item._id}`,
        type: 'prediction',
        date: item?.predictionDate ? new Date(item.predictionDate) : new Date(),
        title: `Health Prediction • ${item?.aiAnalysis?.riskLevel || 'unknown'}`,
        detail: `Score: ${item?.aiAnalysis?.riskScore ?? '-'} • Urgency: ${item?.aiAnalysis?.urgencyLevel || '-'}`
      }));

    return [...appointmentEvents, ...predictionEvents]
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [appointments, predictions, selectedPatientId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Patient Health Timeline</h1>
            <p className="text-sm text-gray-600">Unified view of appointments, predictions, and vitals</p>
          </div>
          <Link to="/doctor">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Patient</label>
          <select
            value={selectedPatientId}
            onChange={(event) => {
              const id = event.target.value;
              setSelectedPatientId(id);
              const match = patients.find((item) => item._id === id);
              setSelectedPatientName(match?.name || 'Patient');
            }}
            className="w-full md:w-80 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select patient</option>
            {patients.map((patient) => (
              <option key={patient._id} value={patient._id}>{patient.name}</option>
            ))}
          </select>
        </section>

        {timelineLoading ? (
          <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-600">Loading timeline...</div>
        ) : !selectedPatientId ? (
          <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-600">No patient selected.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900">Timeline • {selectedPatientName}</h2>
              <div className="mt-4 space-y-3">
                {timelineItems.length === 0 ? (
                  <p className="text-sm text-gray-600">No timeline events found.</p>
                ) : (
                  timelineItems.map((event) => (
                    <div key={event.id} className="rounded-lg border border-gray-200 p-3">
                      <p className="text-sm font-medium text-gray-900">{event.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{event.date.toLocaleString()}</p>
                      <p className="text-sm text-gray-700 mt-1">{event.detail}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Vitals (30 days)</h2>
              {vitalsLoading ? (
                <p className="text-sm text-gray-600 mt-4">Loading vitals...</p>
              ) : vitalsChart.length === 0 ? (
                <p className="text-sm text-gray-600 mt-4">No vital readings available.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {vitalsChart.slice(-8).reverse().map((entry, index) => (
                    <div key={`${entry.name}-${index}`} className="rounded-lg border border-gray-200 p-3 text-sm">
                      <p className="font-medium text-gray-900">{entry.name}</p>
                      <p className="text-gray-700 mt-1">
                        BP: {entry.systolic || '-'} / {entry.diastolic || '-'} • Sugar: {entry.bloodSugar || '-'} • HR: {entry.heartRate || '-'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default DoctorPatientTimeline;
