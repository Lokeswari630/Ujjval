import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, CalendarDays } from 'lucide-react';
import Button from '../components/ui/Button';
import { appointmentsAPI } from '../services/api';

const DoctorPatientRecords = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await appointmentsAPI.getAll({ limit: 100 });
        setAppointments(response?.data || []);
      } catch (loadError) {
        setError(loadError?.message || 'Failed to load patient records');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const patients = useMemo(() => {
    const patientsMap = new Map();

    appointments.forEach((appointment) => {
      const patient = appointment?.patientId;
      if (!patient?._id) return;

      const existing = patientsMap.get(patient._id) || {
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
      const dateValue = appointment?.date ? new Date(appointment.date) : null;
      if (dateValue && (!existing.lastVisitDate || dateValue > existing.lastVisitDate)) {
        existing.lastVisitDate = dateValue;
      }

      patientsMap.set(patient._id, existing);
    });

    return Array.from(patientsMap.values()).sort((a, b) => {
      const aTime = a.lastVisitDate ? a.lastVisitDate.getTime() : 0;
      const bTime = b.lastVisitDate ? b.lastVisitDate.getTime() : 0;
      return bTime - aTime;
    });
  }, [appointments]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Patient Records</h1>
            <p className="text-sm text-gray-600">Your patient history from appointments</p>
          </div>
          <Link to="/doctor">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-600">Loading patient records...</div>
        ) : patients.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-600">No patient records found yet.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 text-gray-700">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Total Patients: {patients.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-2">Name</th>
                    <th className="text-left px-4 py-2">Email</th>
                    <th className="text-left px-4 py-2">Phone</th>
                    <th className="text-left px-4 py-2">Age/Gender</th>
                    <th className="text-left px-4 py-2">Visits</th>
                    <th className="text-left px-4 py-2">Last Visit</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient._id} className="border-t border-gray-100">
                      <td className="px-4 py-2 font-medium text-gray-900">{patient.name}</td>
                      <td className="px-4 py-2 text-gray-700">{patient.email}</td>
                      <td className="px-4 py-2 text-gray-700">{patient.phone}</td>
                      <td className="px-4 py-2 text-gray-700">{patient.age} / {patient.gender}</td>
                      <td className="px-4 py-2 text-gray-700">{patient.visits}</td>
                      <td className="px-4 py-2 text-gray-700">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {patient.lastVisitDate ? patient.lastVisitDate.toLocaleDateString() : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DoctorPatientRecords;
