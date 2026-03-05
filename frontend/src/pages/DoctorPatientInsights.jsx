import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { appointmentsAPI, healthPredictionAPI, monitoringAPI } from '../services/api';

const DoctorPatientInsights = () => {
  const [appointments, setAppointments] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [vitalsChart, setVitalsChart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        const [appointmentsResponse, predictionsResponse] = await Promise.all([
          appointmentsAPI.getAll({ limit: 120 }),
          healthPredictionAPI.getDoctorPatientsPredictions({ limit: 120 })
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
        setError(loadError?.message || 'Failed to load patient insights');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const patientRecords = useMemo(() => {
    const map = new Map();

    appointments.forEach((appointment) => {
      const patient = appointment?.patientId;
      if (!patient?._id) return;

      const existing = map.get(patient._id) || {
        _id: patient._id,
        name: patient.name || 'Patient',
        email: patient.email || '-',
        phone: patient.phone || '-',
        age: patient.age ?? '-',
        gender: patient.gender || '-',
        visits: 0,
        lastVisitDate: null
      };

      existing.visits += 1;
      const date = appointment?.date ? new Date(appointment.date) : null;
      if (date && (!existing.lastVisitDate || date > existing.lastVisitDate)) {
        existing.lastVisitDate = date;
      }

      map.set(patient._id, existing);
    });

    return Array.from(map.values()).sort((a, b) => {
      const aTime = a.lastVisitDate ? a.lastVisitDate.getTime() : 0;
      const bTime = b.lastVisitDate ? b.lastVisitDate.getTime() : 0;
      return bTime - aTime;
    });
  }, [appointments]);

  useEffect(() => {
    const loadVitals = async () => {
      if (!selectedPatientId) {
        setVitalsChart([]);
        return;
      }

      try {
        setVitalsLoading(true);
        const response = await monitoringAPI.getTrends(30, selectedPatientId);
        setVitalsChart(response?.data?.chart || []);
      } catch {
        setVitalsChart([]);
      } finally {
        setVitalsLoading(false);
      }
    };

    loadVitals();
  }, [selectedPatientId]);

  const timelineEvents = useMemo(() => {
    if (!selectedPatientId) return [];

    const appointmentEvents = appointments
      .filter((item) => item?.patientId?._id === selectedPatientId)
      .map((item) => ({
        id: `apt-${item._id}`,
        kind: 'Appointment',
        date: item?.date ? new Date(item.date) : new Date(),
        title: `${item.type} • ${item.status}`,
        detail: `${item.startTime} - ${item.endTime}`
      }));

    const predictionEvents = predictions
      .filter((item) => item?.patientId?._id === selectedPatientId)
      .map((item) => ({
        id: `pred-${item._id}`,
        kind: 'Prediction',
        date: item?.predictionDate ? new Date(item.predictionDate) : new Date(),
        title: `Risk: ${item?.aiAnalysis?.riskLevel || 'unknown'}`,
        detail: `Score ${item?.aiAnalysis?.riskScore ?? '-'} • ${item?.aiAnalysis?.urgencyLevel || '-'}`
      }));

    return [...appointmentEvents, ...predictionEvents]
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [appointments, predictions, selectedPatientId]);

  const onSelectPatient = (patient) => {
    setSelectedPatientId(patient._id);
    setSelectedPatientName(patient.name);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Patient Insights</h1>
            <p className="text-sm text-gray-600">Records & timeline</p>
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

        {loading ? (
          <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-600">Loading patient insights...</div>
        ) : (
          <>
            <section className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 text-sm font-medium text-gray-700">
                Patient Records ({patientRecords.length})
              </div>
              {patientRecords.length === 0 ? (
                <div className="p-6 text-sm text-gray-600">No patient records found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left px-4 py-2">Name</th>
                        <th className="text-left px-4 py-2">Visits</th>
                        <th className="text-left px-4 py-2">Last Visit</th>
                        <th className="text-left px-4 py-2">Contact</th>
                        <th className="text-left px-4 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientRecords.map((patient) => (
                        <tr key={patient._id} className="border-t border-gray-100">
                          <td className="px-4 py-2 font-medium text-gray-900">{patient.name}</td>
                          <td className="px-4 py-2 text-gray-700">{patient.visits}</td>
                          <td className="px-4 py-2 text-gray-700">{patient.lastVisitDate ? patient.lastVisitDate.toLocaleDateString() : '-'}</td>
                          <td className="px-4 py-2 text-gray-700">{patient.email}</td>
                          <td className="px-4 py-2">
                            <Button size="sm" variant="outline" onClick={() => onSelectPatient(patient)}>
                              View Timeline
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Timeline {selectedPatientName ? `• ${selectedPatientName}` : ''}
                </h2>
                <div className="mt-4 space-y-3">
                  {!selectedPatientId ? (
                    <p className="text-sm text-gray-600">Select a patient from records.</p>
                  ) : timelineEvents.length === 0 ? (
                    <p className="text-sm text-gray-600">No timeline events found.</p>
                  ) : (
                    timelineEvents.map((event) => (
                      <div key={event.id} className="rounded-lg border border-gray-200 p-3">
                        <p className="text-xs text-gray-500">{event.kind} • {event.date.toLocaleString()}</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{event.title}</p>
                        <p className="text-sm text-gray-700 mt-1">{event.detail}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900">Recent Vitals (30 days)</h2>
                <div className="mt-4 space-y-2">
                  {vitalsLoading ? (
                    <p className="text-sm text-gray-600">Loading vitals...</p>
                  ) : vitalsChart.length === 0 ? (
                    <p className="text-sm text-gray-600">No vital readings found for this patient.</p>
                  ) : (
                    vitalsChart.slice(-8).reverse().map((entry, index) => (
                      <div key={`${entry.name}-${index}`} className="rounded-lg border border-gray-200 p-3 text-sm">
                        <p className="font-medium text-gray-900">{entry.name}</p>
                        <p className="text-gray-700 mt-1">
                          BP: {entry.systolic || '-'} / {entry.diastolic || '-'} • Sugar: {entry.bloodSugar || '-'} • HR: {entry.heartRate || '-'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default DoctorPatientInsights;
