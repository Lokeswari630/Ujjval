import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import { doctorsAPI, emergencyTicketsAPI } from '../services/api';

const INCIDENT_TYPES = [
  { value: 'accident', label: 'Accident' },
  { value: 'cardiac', label: 'Cardiac Issue' },
  { value: 'breathing', label: 'Breathing Problem' },
  { value: 'stroke', label: 'Stroke Symptoms' },
  { value: 'trauma', label: 'Major Trauma' },
  { value: 'other', label: 'Other Emergency' }
];

const EmergencyIncident = () => {
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [formData, setFormData] = useState({
    hospital: '',
    incidentType: 'accident',
    description: '',
    symptoms: ''
  });

  useEffect(() => {
    const loadHospitals = async () => {
      try {
        setLoadingHospitals(true);
        const response = await doctorsAPI.getBookingOptions({});
        const options = response?.data?.hospitals || [];
        setHospitals(options);
      } catch (error) {
        console.error('Failed to load hospitals:', error);
        setHospitals([]);
      } finally {
        setLoadingHospitals(false);
      }
    };

    loadHospitals();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.hospital || !formData.description.trim()) {
      setNotice({ type: 'error', message: 'Hospital and incident details are required.' });
      return;
    }

    try {
      setSubmitting(true);
      setNotice({ type: '', message: '' });

      const symptoms = formData.symptoms
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      const response = await emergencyTicketsAPI.create({
        hospital: formData.hospital,
        incidentType: formData.incidentType,
        description: formData.description.trim(),
        symptoms
      });

      const totalDoctors = response?.data?.notifiedDoctors?.length || 0;
      setNotice({
        type: 'success',
        message: `Emergency ticket created and sent to ${totalDoctors} doctors in ${formData.hospital}.`
      });

      setFormData((prev) => ({
        ...prev,
        description: '',
        symptoms: ''
      }));
    } catch (error) {
      setNotice({
        type: 'error',
        message: error?.message || 'Unable to raise emergency ticket. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h1 className="text-xl font-semibold text-gray-900">Emergency Incident</h1>
          </div>
          <Link
            to="/patient"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-5">
            Raise an emergency ticket to all doctors in the selected hospital. Doctors previously related to your case are highlighted first in their dashboard feed.
          </p>

          {notice.message && (
            <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              notice.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {notice.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hospital</label>
              <select
                name="hospital"
                value={formData.hospital}
                onChange={handleChange}
                disabled={loadingHospitals}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              >
                <option value="">{loadingHospitals ? 'Loading hospitals...' : 'Select hospital'}</option>
                {hospitals.map((hospital) => (
                  <option key={hospital} value={hospital}>
                    {hospital}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Type</label>
              <select
                name="incidentType"
                value={formData.incidentType}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              >
                {INCIDENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Incident Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Describe what happened and current patient condition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Symptoms (optional)</label>
              <input
                name="symptoms"
                value={formData.symptoms}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="chest pain, breathlessness, dizziness"
              />
              <p className="text-xs text-gray-500 mt-1">Use comma-separated symptoms.</p>
            </div>

            <div className="pt-2">
              <Button type="submit" variant="danger" disabled={submitting || loadingHospitals}>
                {submitting ? 'Raising Emergency Ticket...' : 'Raise Emergency Ticket'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default EmergencyIncident;
