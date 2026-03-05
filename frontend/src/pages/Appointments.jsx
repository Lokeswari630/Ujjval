import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Stethoscope, User, PlusCircle, ClipboardList } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { appointmentsAPI, doctorsAPI } from '../services/api';

const initialBookForm = {
  state: '',
  hospital: '',
  specialization: '',
  doctorId: '',
  slot: '',
  date: '',
  startTime: '',
  endTime: '',
  type: 'consultation',
  symptoms: '',
  description: ''
};

const initialPrescriptionForm = {
  diagnosis: '',
  medicineName: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: ''
};

const getHomePath = (role) => {
  if (role === 'patient') return '/patient';
  if (role === 'doctor') return '/doctor';
  if (role === 'admin') return '/admin';
  if (role === 'pharmacist') return '/pharmacist';
  return '/dashboard';
};

const Appointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bookForm, setBookForm] = useState(initialBookForm);
  const [showBookForm, setShowBookForm] = useState(false);
  const [doctorsInfoMessage, setDoctorsInfoMessage] = useState('');
  const [bookingOptions, setBookingOptions] = useState({
    states: [],
    hospitals: [],
    specializations: [],
    nearbyState: null
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [prescriptionForm, setPrescriptionForm] = useState(initialPrescriptionForm);

  const isPatient = user?.role === 'patient';
  const isDoctor = user?.role === 'doctor';

  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await appointmentsAPI.getAll({ limit: 50 });
      setAppointments(response?.data || []);
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const loadDoctors = async (filters = {}) => {
    if (!isPatient) return;
    try {
      const response = await doctorsAPI.getBookingOptions({
        ...(filters.state ? { state: filters.state } : {}),
        ...(filters.hospital ? { hospital: filters.hospital } : {}),
        ...(filters.specialization ? { specialization: filters.specialization } : {})
      });

      const options = response?.data || {};
      const doctorRows = options?.doctors || [];

      setBookingOptions({
        states: options.states || [],
        hospitals: options.hospitals || [],
        specializations: options.specializations || [],
        nearbyState: options.nearbyState || null
      });

      setDoctors(doctorRows);

      if (doctorRows.length === 0) {
        const nearMessage = options?.nearbyState
          ? `No matching doctors found near you (${options.nearbyState}). Try another state/hospital/specialization.`
          : 'No doctor profiles are available right now. Please try again later.';
        setDoctorsInfoMessage(nearMessage);
      } else {
        setDoctorsInfoMessage('');
      }
    } catch (loadError) {
      console.error('Failed to load doctors:', loadError);
      setDoctorsInfoMessage('Unable to load doctors right now. Please refresh and try again.');
    }
  };

  useEffect(() => {
    loadAppointments();
    loadDoctors(initialBookForm);
  }, []);

  const summary = useMemo(() => {
    return {
      total: appointments.length,
      upcoming: appointments.filter((item) => ['scheduled', 'confirmed'].includes(item.status)).length,
      completed: appointments.filter((item) => item.status === 'completed').length,
      cancelled: appointments.filter((item) => item.status === 'cancelled').length
    };
  }, [appointments]);

  const computeAvailableSlots = (doctor, selectedDate) => {
    if (!doctor || !selectedDate) return [];

    const [year, month, day] = String(selectedDate).split('-').map(Number);
    if (!year || !month || !day) return [];

    const localDate = new Date(year, month - 1, day);
    if (Number.isNaN(localDate.getTime())) return [];

    const selectedIsoDate = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const specificSlots = (doctor.timeSlots || [])
      .filter((slot) => {
        if (slot.isBooked) return false;
        const slotDate = new Date(slot.date);
        if (Number.isNaN(slotDate.getTime())) return false;
        const slotIsoDate = slotDate.toISOString().slice(0, 10);
        return slotIsoDate === selectedIsoDate;
      })
      .map((slot) => ({
        key: `timeslot-${slot.startTime}-${slot.endTime}`,
        label: `${slot.startTime} - ${slot.endTime}`,
        startTime: slot.startTime,
        endTime: slot.endTime
      }));

    if (specificSlots.length > 0) {
      return specificSlots;
    }

    const dayName = localDate.toLocaleDateString('en-US', { weekday: 'long' });

    return (doctor.availability || [])
      .filter((slot) => slot.day === dayName && slot.isAvailable)
      .map((slot, index) => ({
        key: `availability-${index}-${slot.startTime}-${slot.endTime}`,
        label: `${slot.startTime} - ${slot.endTime}`,
        startTime: slot.startTime,
        endTime: slot.endTime
      }));
  };

  const onBookChange = (event) => {
    const { name, value } = event.target;

    if (name === 'state') {
      const nextForm = {
        ...bookForm,
        state: value,
        hospital: '',
        specialization: '',
        doctorId: '',
        slot: '',
        startTime: '',
        endTime: ''
      };
      setBookForm(nextForm);
      setAvailableSlots([]);
      loadDoctors(nextForm);
      return;
    }

    if (name === 'hospital' || name === 'specialization') {
      const nextForm = {
        ...bookForm,
        [name]: value,
        doctorId: '',
        slot: '',
        startTime: '',
        endTime: ''
      };
      setBookForm(nextForm);
      setAvailableSlots([]);
      loadDoctors(nextForm);
      return;
    }

    if (name === 'doctorId') {
      const nextForm = {
        ...bookForm,
        doctorId: value,
        slot: '',
        startTime: '',
        endTime: ''
      };
      setBookForm(nextForm);
      const selectedDoctor = doctors.find((doctor) => doctor._id === value);
      setAvailableSlots(computeAvailableSlots(selectedDoctor, nextForm.date));
      return;
    }

    if (name === 'date') {
      const nextForm = {
        ...bookForm,
        date: value,
        slot: '',
        startTime: '',
        endTime: ''
      };
      setBookForm(nextForm);
      const selectedDoctor = doctors.find((doctor) => doctor._id === nextForm.doctorId);
      setAvailableSlots(computeAvailableSlots(selectedDoctor, value));
      return;
    }

    if (name === 'slot') {
      const selectedSlot = availableSlots.find((slot) => slot.key === value);
      setBookForm((prev) => ({
        ...prev,
        slot: value,
        startTime: selectedSlot?.startTime || '',
        endTime: selectedSlot?.endTime || ''
      }));
      return;
    }

    setBookForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitBookAppointment = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await appointmentsAPI.create({
        doctorId: bookForm.doctorId,
        date: bookForm.date,
        startTime: bookForm.startTime,
        endTime: bookForm.endTime,
        type: bookForm.type,
        symptoms: bookForm.symptoms
          .split(',')
          .map((symptom) => symptom.trim())
          .filter(Boolean),
        description: bookForm.description
      });

      setBookForm(initialBookForm);
      setShowBookForm(false);
      await loadAppointments();
    } catch (submitError) {
      setError(submitError?.message || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (appointmentId, status) => {
    setSubmitting(true);
    setError('');

    try {
      await appointmentsAPI.updateStatus(appointmentId, status);
      await loadAppointments();
    } catch (statusError) {
      setError(statusError?.message || 'Failed to update appointment status');
    } finally {
      setSubmitting(false);
    }
  };

  const submitDiagnosisAndPrescription = async (event) => {
    event.preventDefault();
    if (!selectedAppointment?._id) return;

    setSubmitting(true);
    setError('');

    try {
      if (prescriptionForm.diagnosis.trim()) {
        await appointmentsAPI.addDiagnosis(selectedAppointment._id, {
          diagnosis: prescriptionForm.diagnosis.trim()
        });
      }

      if (prescriptionForm.medicineName.trim()) {
        await appointmentsAPI.addPrescription(selectedAppointment._id, {
          medicines: [
            {
              name: prescriptionForm.medicineName.trim(),
              dosage: prescriptionForm.dosage.trim() || 'As prescribed',
              frequency: prescriptionForm.frequency.trim() || 'Twice daily',
              duration: prescriptionForm.duration.trim() || '5 days',
              instructions: prescriptionForm.instructions.trim()
            }
          ],
          instructions: prescriptionForm.instructions.trim()
        });
      }

      setSelectedAppointment(null);
      setPrescriptionForm(initialPrescriptionForm);
      await loadAppointments();
    } catch (saveError) {
      setError(saveError?.message || 'Failed to save diagnosis/prescription');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Appointments</h1>
            <p className="text-sm text-gray-600">Fully connected appointment workflow</p>
          </div>
          <div className="flex items-center gap-2">
            {isPatient && (
              <Button onClick={() => setShowBookForm((prev) => !prev)}>
                <PlusCircle className="w-4 h-4 mr-2" />
                {showBookForm ? 'Close Form' : 'Book Appointment'}
              </Button>
            )}
            <Link to={getHomePath(user?.role)}>
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-semibold text-gray-900">{summary.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Upcoming</p>
            <p className="text-2xl font-semibold text-blue-700">{summary.upcoming}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-semibold text-green-700">{summary.completed}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Cancelled</p>
            <p className="text-2xl font-semibold text-red-700">{summary.cancelled}</p>
          </div>
        </section>

        {isPatient && showBookForm && (
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Book New Appointment</h2>
            <form onSubmit={submitBookAppointment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State (optional)</label>
                <select
                  name="state"
                  value={bookForm.state}
                  onChange={onBookChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Nearby doctors (auto)</option>
                  {bookingOptions.states.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hospital (optional)</label>
                <select
                  name="hospital"
                  value={bookForm.hospital}
                  onChange={onBookChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All hospitals</option>
                  {bookingOptions.hospitals.map((hospital) => (
                    <option key={hospital} value={hospital}>{hospital}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                <select
                  name="specialization"
                  value={bookForm.specialization}
                  onChange={onBookChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select specialization</option>
                  {bookingOptions.specializations.map((specialization) => (
                    <option key={specialization} value={specialization}>{specialization}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
                <select
                  name="doctorId"
                  value={bookForm.doctorId}
                  onChange={onBookChange}
                  required
                  disabled={doctors.length === 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor._id} value={doctor._id}>
                      {doctor?.userId?.name} • {doctor?.specialization} • {doctor?.experience || 0} yrs • {doctor?.hospital || 'Hospital N/A'}
                    </option>
                  ))}
                </select>
                {doctorsInfoMessage && (
                  <p className="mt-2 text-xs text-amber-700">{doctorsInfoMessage}</p>
                )}
              </div>

              <Input name="date" type="date" label="Date" value={bookForm.date} onChange={onBookChange} required />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Available Slot</label>
                <select
                  name="slot"
                  value={bookForm.slot}
                  onChange={onBookChange}
                  required
                  disabled={!bookForm.doctorId || !bookForm.date || availableSlots.length === 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">
                    {bookForm.doctorId && bookForm.date
                      ? (availableSlots.length > 0 ? 'Select available slot' : 'No slots available for selected date')
                      : 'Select doctor and date first'}
                  </option>
                  {availableSlots.map((slot) => (
                    <option key={slot.key} value={slot.key}>{slot.label}</option>
                  ))}
                </select>
              </div>

              <Input name="startTime" type="time" label="Start Time" value={bookForm.startTime} onChange={onBookChange} required />
              <Input name="endTime" type="time" label="End Time" value={bookForm.endTime} onChange={onBookChange} required />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  name="type"
                  value={bookForm.type}
                  onChange={onBookChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="consultation">Consultation</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="check_up">Check Up</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <Input
                name="symptoms"
                label="Symptoms (comma separated)"
                value={bookForm.symptoms}
                onChange={onBookChange}
                placeholder="fever, cough"
              />
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={bookForm.description}
                  onChange={onBookChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your issue"
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" loading={submitting}>Create Appointment</Button>
              </div>
            </form>
          </section>
        )}

        <section className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Appointment List</h2>
            <span className="text-sm text-gray-500">{appointments.length} records</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading appointments...</div>
          ) : appointments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <ClipboardList className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p>No appointments found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {appointments.map((appointment) => (
                <div key={appointment._id} className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(appointment.date).toLocaleDateString()} • {appointment.startTime} - {appointment.endTime}
                      </p>
                      <p className="text-sm text-gray-700 flex items-center gap-2">
                        <Stethoscope className="w-4 h-4" />
                        Doctor: {appointment?.doctorId?.userId?.name || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-700 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Patient: {appointment?.patientId?.name || user?.name || 'N/A'}
                      </p>
                      {appointment?.diagnosis && (
                        <p className="text-sm text-gray-700">Diagnosis: {appointment.diagnosis}</p>
                      )}
                      {appointment?.prescription?.medicines?.length > 0 && (
                        <p className="text-sm text-gray-700">
                          Prescription: {appointment.prescription.medicines.map((medicine) => medicine.name).join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {appointment.status}
                      </span>

                      {isPatient && ['scheduled', 'confirmed'].includes(appointment.status) && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => updateStatus(appointment._id, 'cancelled')}
                          loading={submitting}
                        >
                          Cancel
                        </Button>
                      )}

                      {isDoctor && ['scheduled', 'confirmed'].includes(appointment.status) && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus(appointment._id, 'in_progress')}
                          loading={submitting}
                        >
                          Start
                        </Button>
                      )}

                      {isDoctor && appointment.status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => updateStatus(appointment._id, 'completed')}
                          loading={submitting}
                        >
                          Complete
                        </Button>
                      )}

                      {isDoctor && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedAppointment(appointment)}
                        >
                          Add Notes
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Modal
        isOpen={Boolean(selectedAppointment)}
        onClose={() => {
          setSelectedAppointment(null);
          setPrescriptionForm(initialPrescriptionForm);
        }}
        title="Add Diagnosis & Prescription"
      >
        <form onSubmit={submitDiagnosisAndPrescription} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
            <textarea
              value={prescriptionForm.diagnosis}
              onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, diagnosis: event.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter diagnosis"
            />
          </div>

          <Input
            label="Medicine Name"
            value={prescriptionForm.medicineName}
            onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, medicineName: event.target.value }))}
            placeholder="Paracetamol"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Dosage"
              value={prescriptionForm.dosage}
              onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, dosage: event.target.value }))}
              placeholder="500mg"
            />
            <Input
              label="Frequency"
              value={prescriptionForm.frequency}
              onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, frequency: event.target.value }))}
              placeholder="Twice daily"
            />
            <Input
              label="Duration"
              value={prescriptionForm.duration}
              onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, duration: event.target.value }))}
              placeholder="5 days"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
            <textarea
              value={prescriptionForm.instructions}
              onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, instructions: event.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Take after meal"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedAppointment(null);
                setPrescriptionForm(initialPrescriptionForm);
              }}
            >
              Close
            </Button>
            <Button type="submit" loading={submitting}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Appointments;
