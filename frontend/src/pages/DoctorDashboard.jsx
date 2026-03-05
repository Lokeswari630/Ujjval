import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Users, Activity, Clock, TrendingUp, Stethoscope, FileText, BadgeIndianRupee, AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button';
import HealthChart from '../components/charts/HealthChart';
import { appointmentsAPI, doctorsAPI, emergencyTicketsAPI } from '../services/api';

const DoctorDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState({
    appointments: [],
    paymentRequests: [],
    emergencyTickets: [],
    profile: null
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [emergencyActionLoading, setEmergencyActionLoading] = useState({});
  const [expandedEmergencyTicket, setExpandedEmergencyTicket] = useState('');
  const [statsTrackIndex, setStatsTrackIndex] = useState(0);
  const [statsTrackAnimating, setStatsTrackAnimating] = useState(true);
  const [prescriptionUploadForm, setPrescriptionUploadForm] = useState({
    appointmentId: '',
    title: '',
    fileData: '',
    fileName: '',
    fileType: ''
  });
  const [prescriptionUploading, setPrescriptionUploading] = useState(false);
  const [prescriptionUploadError, setPrescriptionUploadError] = useState('');
  const [prescriptionUploadMessage, setPrescriptionUploadMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const isMissingDoctorProfileError = (error) => {
    if (!error) return false;
    const message = typeof error === 'string' ? error : error.message;
    return typeof message === 'string' && message.toLowerCase().includes('doctor profile not found');
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [appointmentsResult, paymentRequestsResult, profileResult, emergencyTicketsResult] = await Promise.allSettled([
        appointmentsAPI.getAll({ limit: 100 }),
        appointmentsAPI.getAll({ status: 'payment_submitted' }),
        doctorsAPI.getProfile(),
        emergencyTicketsAPI.getDoctorFeed()
      ]);

      if (appointmentsResult.status === 'rejected') {
        throw appointmentsResult.reason;
      }

      if (profileResult.status === 'rejected' && !isMissingDoctorProfileError(profileResult.reason)) {
        throw profileResult.reason;
      }

      setData({
        appointments: appointmentsResult.value.data || [],
        paymentRequests: paymentRequestsResult.status === 'fulfilled' ? paymentRequestsResult.value.data || [] : [],
        emergencyTickets: emergencyTicketsResult.status === 'fulfilled' ? emergencyTicketsResult.value.data || [] : [],
        profile: profileResult.status === 'fulfilled' ? profileResult.value.data : null
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const uniquePatients = new Set(
    data.appointments
      .map((appointment) => appointment?.patientId?._id)
      .filter(Boolean)
  ).size;

  const pendingAcceptanceCount = data.paymentRequests.length;

  const appointmentTrendsMap = data.appointments.reduce((acc, appointment) => {
    const dateValue = appointment?.date;
    if (!dateValue) return acc;
    const date = new Date(dateValue);
    const day = date.toLocaleDateString('en-US', { weekday: 'short' });
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const weekDayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const appointmentTrends = weekDayOrder.map((day) => ({
    name: day,
    value: appointmentTrendsMap[day] || 0
  }));

  const demographicBuckets = data.appointments.reduce((acc, appointment) => {
    const age = appointment?.patientId?.age;
    if (typeof age !== 'number') return acc;
    if (age <= 18) acc['0-18'] += 1;
    else if (age <= 35) acc['19-35'] += 1;
    else if (age <= 50) acc['36-50'] += 1;
    else acc['51+'] += 1;
    return acc;
  }, { '0-18': 0, '19-35': 0, '36-50': 0, '51+': 0 });

  const patientDemographics = [
    { name: '0-18', value: demographicBuckets['0-18'] },
    { name: '19-35', value: demographicBuckets['19-35'] },
    { name: '36-50', value: demographicBuckets['36-50'] },
    { name: '51+', value: demographicBuckets['51+'] }
  ];

  const averageConsultationMinutes = data.appointments.length
    ? Math.round(
      data.appointments.reduce((sum, appointment) => {
        const start = appointment?.startTime;
        const end = appointment?.endTime;
        if (!start || !end) return sum;
        const [startHour, startMinute] = String(start).split(':').map(Number);
        const [endHour, endMinute] = String(end).split(':').map(Number);
        const startTotal = (startHour * 60) + startMinute;
        const endTotal = (endHour * 60) + endMinute;
        return sum + Math.max(endTotal - startTotal, 0);
      }, 0) / data.appointments.length
    )
    : 0;

  const completedAppointments = data.appointments.filter((appointment) => appointment.status === 'completed').length;
  const successRate = data.appointments.length
    ? Math.round((completedAppointments / data.appointments.length) * 100)
    : 0;

  const statsSlides = [
    {
      title: 'Total Appointments',
      value: data.appointments.length,
      color: 'bg-blue-500',
      Icon: Calendar
    },
    {
      title: 'Total Patients',
      value: uniquePatients,
      color: 'bg-green-500',
      Icon: Users
    },
    {
      title: 'Avg. Consultation',
      value: `${averageConsultationMinutes} min`,
      color: 'bg-purple-500',
      Icon: Clock
    },
    {
      title: 'Success Rate',
      value: `${successRate}%`,
      color: 'bg-orange-500',
      Icon: TrendingUp
    },
    {
      title: 'Pending Acceptance',
      value: pendingAcceptanceCount,
      color: 'bg-amber-500',
      Icon: BadgeIndianRupee
    }
  ];

  const statsSlidesExtended = [...statsSlides, statsSlides[0]];
  const currentStatsDisplayIndex = statsTrackIndex >= statsSlides.length ? 0 : statsTrackIndex;

  useEffect(() => {
    if (activeTab !== 'overview') return undefined;

    const intervalId = setInterval(() => {
      setStatsTrackAnimating(true);
      setStatsTrackIndex((prev) => (prev >= statsSlides.length ? 1 : prev + 1));
    }, 2000);

    return () => clearInterval(intervalId);
  }, [activeTab, statsSlides.length]);

  useEffect(() => {
    if (!statsTrackAnimating) return undefined;
    if (statsTrackIndex !== statsSlides.length) return undefined;

    const resetTimer = setTimeout(() => {
      setStatsTrackAnimating(false);
      setStatsTrackIndex(0);
      setTimeout(() => {
        setStatsTrackAnimating(true);
      }, 20);
    }, 720);

    return () => clearTimeout(resetTimer);
  }, [statsTrackIndex, statsSlides.length, statsTrackAnimating]);
  const goToNextStatsSlide = () => {
    setStatsTrackAnimating(true);
    setStatsTrackIndex((prev) => (prev >= statsSlides.length ? 1 : prev + 1));
  };

  const goToPreviousStatsSlide = () => {
    setStatsTrackAnimating(true);
    setStatsTrackIndex((prev) => {
      if (prev === 0) {
        return statsSlides.length - 1;
      }
      return prev - 1;
    });
  };

  const handleStatsTrackTransitionEnd = () => {};

  const quickActions = [
    {
      title: 'View Appointments',
      description: 'Manage your schedule',
      icon: <Calendar className="w-6 h-6" />,
      link: '/appointments',
      color: 'bg-blue-500'
    },
    {
      title: 'Patient Insights',
      description: 'Records and timeline',
      icon: <FileText className="w-6 h-6" />,
      link: '/patient-insights',
      color: 'bg-green-500'
    },
    {
      title: 'Health Predictions',
      description: 'Review AI predictions',
      icon: <Activity className="w-6 h-6" />,
      link: '/health-predictions',
      color: 'bg-purple-500'
    },
    {
      title: 'Priority Queue',
      description: 'View prioritized patients',
      icon: <Clock className="w-6 h-6" />,
      link: '/doctor-queue',
      color: 'bg-red-500'
    }
  ];

  const handlePaymentRequestAction = async (appointmentId, nextStatus) => {
    try {
      setActionLoading(true);
      await appointmentsAPI.updateStatus(appointmentId, nextStatus);
      await loadData();
    } catch (error) {
      console.error('Failed to update payment request:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEmergencyTicketAction = async (ticketId, nextStatus) => {
    try {
      setEmergencyActionLoading((prev) => ({ ...prev, [ticketId]: true }));
      await emergencyTicketsAPI.updateStatus(ticketId, nextStatus);
      await loadData();
    } catch (error) {
      console.error('Failed to update emergency ticket status:', error);
    } finally {
      setEmergencyActionLoading((prev) => ({ ...prev, [ticketId]: false }));
    }
  };

  const onPrescriptionFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setPrescriptionUploadForm((prev) => ({
        ...prev,
        fileData: '',
        fileName: '',
        fileType: ''
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPrescriptionUploadForm((prev) => ({
        ...prev,
        fileData: typeof reader.result === 'string' ? reader.result : '',
        fileName: file.name,
        fileType: file.type || ''
      }));
    };
    reader.readAsDataURL(file);
  };

  const submitPrescriptionUpload = async (event) => {
    event.preventDefault();
    setPrescriptionUploadError('');
    setPrescriptionUploadMessage('');

    if (!prescriptionUploadForm.appointmentId) {
      setPrescriptionUploadError('Select an appointment before uploading prescription.');
      return;
    }

    if (!prescriptionUploadForm.fileData) {
      setPrescriptionUploadError('Select a prescription file to upload.');
      return;
    }

    try {
      setPrescriptionUploading(true);
      await appointmentsAPI.updateConsultation(prescriptionUploadForm.appointmentId, {
        prescriptionFile: {
          title: prescriptionUploadForm.title.trim(),
          fileName: prescriptionUploadForm.fileName,
          fileData: prescriptionUploadForm.fileData,
          mimeType: prescriptionUploadForm.fileType
        }
      });

      setPrescriptionUploadMessage('Prescription uploaded successfully.');
      setPrescriptionUploadForm({
        appointmentId: '',
        title: '',
        fileData: '',
        fileName: '',
        fileType: ''
      });
      await loadData();
    } catch (error) {
      setPrescriptionUploadError(error?.message || 'Failed to upload prescription');
    } finally {
      setPrescriptionUploading(false);
    }
  };

  const prescriptionUploadAppointments = data.appointments.filter((appointment) => (
    ['confirmed', 'in_progress', 'completed', 'scheduled'].includes(appointment.status)
  ));

  const renderPrescriptionUpload = () => (
    <div className="max-w-3xl">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900">Upload Prescription</h3>
        <p className="mt-1 text-sm text-gray-600">Upload a prescription file just like lab report uploads.</p>

        {prescriptionUploadError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {prescriptionUploadError}
          </div>
        )}

        {prescriptionUploadMessage && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {prescriptionUploadMessage}
          </div>
        )}

        <form onSubmit={submitPrescriptionUpload} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Appointment</label>
            <select
              value={prescriptionUploadForm.appointmentId}
              onChange={(event) => setPrescriptionUploadForm((prev) => ({ ...prev, appointmentId: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select appointment</option>
              {prescriptionUploadAppointments.map((appointment) => (
                <option key={appointment._id} value={appointment._id}>
                  {appointment?.patientId?.name || 'Patient'} • {new Date(appointment.date).toLocaleDateString()} • {appointment.startTime}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prescription Title (optional)</label>
            <input
              type="text"
              value={prescriptionUploadForm.title}
              onChange={(event) => setPrescriptionUploadForm((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Post-consultation prescription"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Prescription</label>
            <input
              type="file"
              accept="image/*"
              onChange={onPrescriptionFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
            {prescriptionUploadForm.fileName && (
              <p className="mt-1 text-xs text-gray-600">Selected: {prescriptionUploadForm.fileName}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={prescriptionUploading}>
              {prescriptionUploading ? 'Uploading...' : 'Upload Prescription'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderPaymentRequests = () => (
    <div className="space-y-4">
      {data.paymentRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-600">No pending payment requests.</div>
      ) : (
        data.paymentRequests.map((request) => (
          <div key={request._id} className="bg-white rounded-lg shadow p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-gray-900">{request?.patientId?.name || 'Patient'}</p>
                <p className="text-sm text-gray-600">
                  {new Date(request.date).toLocaleDateString()} • {request.startTime} - {request.endTime}
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                Payment Submitted
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
              <p>UTR: {request?.paymentProof?.utrNumber || request?.paymentId || 'N/A'}</p>
              <p>Fee: ₹{request?.consultationFee || 0}</p>
              {request?.paymentProof?.receiptUrl && (
                <a className="text-blue-700 underline" href={request.paymentProof.receiptUrl} target="_blank" rel="noreferrer">
                  Open receipt link
                </a>
              )}
              {request?.paymentProof?.receiptImage && !request?.paymentProof?.receiptUrl && (
                <a className="text-blue-700 underline" href={request.paymentProof.receiptImage} target="_blank" rel="noreferrer">
                  Open uploaded receipt
                </a>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button
                size="sm"
                variant="success"
                disabled={actionLoading}
                onClick={() => handlePaymentRequestAction(request._id, 'confirmed')}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={actionLoading}
                onClick={() => handlePaymentRequestAction(request._id, 'cancelled')}
              >
                Reject
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderEmergencyRequests = () => (
    <div className="space-y-4">
      {data.emergencyTickets.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-600">No active emergency requests.</div>
      ) : (
        data.emergencyTickets.map((ticket) => (
          <div
            key={ticket._id}
            className={`bg-white rounded-lg shadow p-5 border ${
              ticket.isHighlighted ? 'border-red-300' : 'border-gray-200'
            }`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-gray-900">{ticket?.patient?.name || 'Patient'}</p>
                <p className="text-sm text-gray-600">
                  {ticket?.hospital || 'Hospital'} • {new Date(ticket.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  ticket.status === 'acknowledged'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {ticket.status}
                </span>
                {ticket.isHighlighted && (
                  <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-red-600 text-white">
                    Related Patient
                  </span>
                )}
              </div>
            </div>

            <p className="mt-3 text-sm text-gray-800">
              <span className="font-medium capitalize">{ticket.incidentType}</span>: {ticket.description}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Symptoms: {Array.isArray(ticket?.symptoms) && ticket.symptoms.length > 0 ? ticket.symptoms.join(', ') : 'Not provided'}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setExpandedEmergencyTicket((prev) => (prev === ticket._id ? '' : ticket._id))}
              >
                {expandedEmergencyTicket === ticket._id ? 'Hide Details' : 'View Details'}
              </Button>
              {ticket.status === 'open' && (
                <Button
                  size="sm"
                  variant="success"
                  disabled={!!emergencyActionLoading[ticket._id]}
                  onClick={() => handleEmergencyTicketAction(ticket._id, 'acknowledged')}
                >
                  {emergencyActionLoading[ticket._id] ? 'Updating...' : 'Acknowledge'}
                </Button>
              )}
              <Button
                size="sm"
                variant="danger"
                disabled={!!emergencyActionLoading[ticket._id]}
                onClick={() => handleEmergencyTicketAction(ticket._id, 'resolved')}
              >
                {emergencyActionLoading[ticket._id] ? 'Updating...' : 'Resolve'}
              </Button>
            </div>

            {expandedEmergencyTicket === ticket._id && (
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 space-y-2">
                <p><span className="font-medium">Patient:</span> {ticket?.patient?.name || 'Patient'}</p>
                <p><span className="font-medium">Phone:</span> {ticket?.patient?.phone || 'N/A'}</p>
                <p><span className="font-medium">Age/Gender:</span> {ticket?.patient?.age || 'N/A'} / {ticket?.patient?.gender || 'N/A'}</p>
                <p><span className="font-medium">Notified Doctors:</span> {ticket?.totalNotifiedDoctors || 0}</p>
                {ticket.primaryDoctors?.length > 0 && (
                  <p>
                    <span className="font-medium">Priority Doctors:</span>{' '}
                    {ticket.primaryDoctors.map((doctor) => doctor.doctorName).join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Emergency Tickets</h3>
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-700">
            {data.emergencyTickets.length} Active
          </span>
        </div>

        {data.emergencyTickets.length === 0 ? (
          <p className="text-sm text-gray-600">No active emergency tickets for your hospital.</p>
        ) : (
          <div>
            <div className="space-y-3">
              {data.emergencyTickets.map((ticket) => (
                <div
                  key={ticket._id}
                  className={`w-full rounded-lg border p-4 ${
                    ticket.isHighlighted
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${ticket.isHighlighted ? 'text-red-600' : 'text-gray-500'}`} />
                      <p className="text-sm font-semibold text-gray-900 capitalize">{ticket.incidentType}</p>
                    </div>
                    {ticket.isHighlighted && (
                      <span className="text-[11px] px-2 py-1 rounded-full bg-red-600 text-white">Related Patient</span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-gray-800 font-medium">{ticket?.patient?.name || 'Patient'}</p>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-3">{ticket.description}</p>

                  <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                    <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                    <span>{ticket.totalNotifiedDoctors} doctors alerted</span>
                  </div>

                  {ticket.primaryDoctors?.length > 0 && (
                    <p className="mt-2 text-[11px] text-gray-700">
                      Priority doctors: {ticket.primaryDoctors.slice(0, 2).map((doctor) => doctor.doctorName).join(', ')}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExpandedEmergencyTicket((prev) => (prev === ticket._id ? '' : ticket._id))}
                    >
                      {expandedEmergencyTicket === ticket._id ? 'Hide Details' : 'View Details'}
                    </Button>
                    {ticket.status === 'open' && (
                      <Button
                        size="sm"
                        variant="success"
                        disabled={!!emergencyActionLoading[ticket._id]}
                        onClick={() => handleEmergencyTicketAction(ticket._id, 'acknowledged')}
                      >
                        {emergencyActionLoading[ticket._id] ? 'Updating...' : 'Acknowledge'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={!!emergencyActionLoading[ticket._id]}
                      onClick={() => handleEmergencyTicketAction(ticket._id, 'resolved')}
                    >
                      {emergencyActionLoading[ticket._id] ? 'Updating...' : 'Resolve'}
                    </Button>
                  </div>

                  {expandedEmergencyTicket === ticket._id && (
                    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700 space-y-2">
                      <p><span className="font-medium">Patient:</span> {ticket?.patient?.name || 'Patient'}</p>
                      <p><span className="font-medium">Phone:</span> {ticket?.patient?.phone || 'N/A'}</p>
                      <p><span className="font-medium">Hospital:</span> {ticket?.hospital || 'N/A'}</p>
                      <p><span className="font-medium">Current Status:</span> {ticket?.status || 'open'}</p>
                      <p>
                        <span className="font-medium">Symptoms:</span>{' '}
                        {Array.isArray(ticket?.symptoms) && ticket.symptoms.length > 0
                          ? ticket.symptoms.join(', ')
                          : 'Not provided'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
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
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Slider */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Doctor Metrics</h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={goToPreviousStatsSlide}
            >
              ←
            </Button>
            <span className="text-xs text-gray-600">{currentStatsDisplayIndex + 1}/{statsSlides.length}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={goToNextStatsSlide}
            >
              →
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <div
            className={`flex ${statsTrackAnimating ? 'transition-transform duration-700 ease-in-out' : ''}`}
            style={{ transform: `translateX(-${statsTrackIndex * 100}%)` }}
            onTransitionEnd={handleStatsTrackTransitionEnd}
          >
            {statsSlidesExtended.map((slide, index) => (
              <div key={`${slide.title}-${index}`} className="w-full shrink-0 p-6 flex items-center justify-center min-h-37.5">
                <div className="flex flex-col lg:flex-row items-center lg:items-center text-center lg:text-left gap-3 lg:gap-6 lg:w-full lg:max-w-2xl lg:justify-center">
                  <div className={`w-12 h-12 ${slide.color} rounded-lg flex items-center justify-center text-white`}>
                    <slide.Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm lg:text-base text-gray-600">{slide.title}</p>
                    <p className="text-2xl lg:text-3xl font-bold text-gray-900">{slide.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Appointments */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h3>
          <div className="space-y-3">
            {data.appointments.length > 0 ? (
              data.appointments.map((appointment) => (
                <div key={appointment._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{appointment.patientId?.name || 'Patient'}</p>
                      <p className="text-sm text-gray-600">{appointment.startTime} - {appointment.endTime}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                    appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {appointment.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No appointments today</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Prescription added</p>
                <p className="text-sm text-gray-600">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Appointment completed</p>
                <p className="text-sm text-gray-600">5 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Health prediction reviewed</p>
                <p className="text-sm text-gray-600">Yesterday</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthChart
          type="bar"
          data={appointmentTrends}
          title="Weekly Appointments"
        />
        <HealthChart
          type="pie"
          data={patientDemographics}
          title="Patient Age Distribution"
        />
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'emergency-requests', label: 'Emergency Requests', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'payment-requests', label: 'Payment Requests', icon: <BadgeIndianRupee className="w-4 h-4" /> },
    { id: 'prescription-upload', label: 'Prescription Upload', icon: <FileText className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Doctor Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Dr. {user?.name}</span>
              <Link
                to="/doctor-profile"
                className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                aria-label="Doctor profile"
                title="Doctor profile"
              >
                <Stethoscope className="w-4 h-4" />
              </Link>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!loading && !data.profile && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-amber-900">Complete your doctor profile</h2>
                <p className="mt-1 text-sm text-amber-800">
                  Your doctor profile is not set up yet. Complete it to unlock full doctor features.
                </p>
              </div>
              <Link to="/doctor-profile">
                <Button size="sm">Complete Profile</Button>
              </Link>
            </div>
          </div>
        )}

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
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'emergency-requests' && renderEmergencyRequests()}
            {activeTab === 'payment-requests' && renderPaymentRequests()}
            {activeTab === 'prescription-upload' && renderPrescriptionUpload()}
            {activeTab === 'analytics' && renderAnalytics()}
          </>
        )}
      </main>
    </div>
  );
};

export default DoctorDashboard;
