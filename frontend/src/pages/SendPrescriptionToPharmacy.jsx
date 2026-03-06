import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Phone, Mail, ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import { appointmentsAPI } from '../services/api';

const SendPrescriptionToPharmacy = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialAppointmentId = searchParams.get('appointmentId') || '';

  const [appointments, setAppointments] = useState([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(initialAppointmentId);
  const [pharmacists, setPharmacists] = useState([]);
  const [patientAddress, setPatientAddress] = useState({});
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const selectedAppointment = useMemo(
    () => appointments.find((item) => item._id === selectedAppointmentId) || null,
    [appointments, selectedAppointmentId]
  );

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await appointmentsAPI.getAll({ limit: 100 });
        const rows = Array.isArray(response?.data) ? response.data : [];

        const eligible = rows.filter((appointment) => {
          const hasPrescription = (appointment?.prescription?.medicines?.length || 0) > 0 || (appointment?.prescriptionFiles?.length || 0) > 0;
          const isBlocked = ['cancelled', 'no_show'].includes(appointment?.status);
          return hasPrescription && !isBlocked;
        });

        setAppointments(eligible);

        if (!selectedAppointmentId && eligible.length > 0) {
          setSelectedAppointmentId(eligible[0]._id);
        }
      } catch (loadError) {
        setError(loadError?.message || 'Failed to load eligible appointments.');
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, []);

  useEffect(() => {
    const loadNearby = async () => {
      if (!selectedAppointmentId) {
        setPharmacists([]);
        return;
      }

      try {
        setError('');
        const response = await appointmentsAPI.getNearbyPharmacists(selectedAppointmentId);
        setPharmacists(response?.data?.pharmacists || []);
        setPatientAddress(response?.data?.patientAddress || {});
      } catch (nearbyError) {
        setPharmacists([]);
        setPatientAddress({});
        setError(nearbyError?.message || 'Failed to fetch nearby pharmacists.');
      }
    };

    loadNearby();
  }, [selectedAppointmentId]);

  const sendToSelectedPharmacist = async (pharmacistId) => {
    if (!selectedAppointmentId || !pharmacistId) return;

    try {
      setMessage('');
      setError('');
      setSendingId(pharmacistId);

      const response = await appointmentsAPI.sendPrescriptionToPharmacy(selectedAppointmentId, {
        emergencyPrePack: true,
        preferredPharmacistId: pharmacistId
      });

      const orderId = response?.data?.orderId || response?.data?._id;
      const orderStatus = response?.data?.status;
      const baseMessage = response?.message || 'Prescription sent to selected pharmacist successfully.';
      const successText = orderId
        ? `${baseMessage} Order: ${orderId}${orderStatus ? ` (${orderStatus})` : ''}`
        : baseMessage;

      setMessage(successText);
      window.alert(successText);
    } catch (sendError) {
      const failMessage = sendError?.message || 'Failed to send prescription to selected pharmacist.';
      setError(failMessage);
      window.alert(failMessage);
    } finally {
      setSendingId('');
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
      <header className="bg-white/90 backdrop-blur border-b border-sky-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => navigate('/appointments')}
                className="text-slate-500 hover:text-sky-700"
                aria-label="Back to appointments"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-slate-900">Send Prescription to Nearby Pharmacy</h1>
            </div>
            <span className="text-sm text-slate-600">{user?.name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}
        {message && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-700">{message}</div>}

        <section className="bg-white rounded-xl border border-sky-100 shadow-sm p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Appointment</label>
          <select
            value={selectedAppointmentId}
            onChange={(event) => setSelectedAppointmentId(event.target.value)}
            className="w-full max-w-2xl px-3 py-2 border border-slate-300 rounded-lg"
          >
            <option value="">Select appointment</option>
            {appointments.map((appointment) => (
              <option key={appointment._id} value={appointment._id}>
                {new Date(appointment.date).toLocaleDateString()} | {appointment.startTime} - {appointment.endTime} | {appointment?.doctorId?.userId?.name || 'Doctor'}
              </option>
            ))}
          </select>

          {selectedAppointment && (
            <p className="mt-2 text-xs text-slate-600">
              Prescription available: {(selectedAppointment?.prescription?.medicines?.length || 0) > 0 ? 'Medicine list' : 'Image upload'}
            </p>
          )}
        </section>

        <section className="bg-white rounded-xl border border-sky-100 shadow-sm p-4">
          <h2 className="text-lg font-semibold text-slate-900">Nearby Pharmacists</h2>
          <p className="text-xs text-slate-600 mt-1">
            Patient location: {patientAddress?.city || '-'}, {patientAddress?.state || '-'} {patientAddress?.zipCode || ''}
          </p>

          {pharmacists.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No nearby pharmacists found for this appointment.</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {pharmacists.map((pharmacist) => (
                <div key={pharmacist._id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{pharmacist.name}</p>
                    <span className="text-xs px-2 py-1 rounded-full bg-sky-100 text-sky-700">{pharmacist.matchLabel.replace('_', ' ')}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700 flex items-center gap-2"><Phone className="w-4 h-4" /> {pharmacist.phone || '-'}</p>
                  <p className="mt-1 text-sm text-slate-700 flex items-center gap-2"><Mail className="w-4 h-4" /> {pharmacist.email || '-'}</p>
                  <p className="mt-1 text-sm text-slate-700 flex items-center gap-2"><MapPin className="w-4 h-4" /> {pharmacist?.address?.city || '-'}, {pharmacist?.address?.state || '-'} {pharmacist?.address?.zipCode || ''}</p>

                  <div className="mt-3">
                    <Button
                      size="sm"
                      onClick={() => sendToSelectedPharmacist(pharmacist._id)}
                      loading={sendingId === pharmacist._id}
                      disabled={!selectedAppointmentId}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Prescription Here
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div>
          <Link to="/appointments" className="text-sm text-sky-700 underline">Back to Appointments</Link>
        </div>
      </main>
    </div>
  );
};

export default SendPrescriptionToPharmacy;
