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
  district: '',
  hospital: '',
  specialization: '',
  doctorId: '',
  slot: '',
  date: '',
  startTime: '',
  endTime: '',
  paymentUtr: '',
  paymentReceiptImage: '',
  paymentReceiptName: '',
  type: 'consultation',
  symptoms: '',
  description: ''
};

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry'
];

const INDIAN_DISTRICTS_BY_STATE = {
  'Andhra Pradesh': ['Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Krishna', 'Kurnool', 'Nellore', 'Srikakulam', 'Visakhapatnam', 'West Godavari'],
  'Arunachal Pradesh': ['Anjaw', 'Changlang', 'Dibang Valley', 'East Siang', 'Itanagar', 'Lower Subansiri', 'Tawang', 'West Kameng'],
  Assam: ['Barpeta', 'Cachar', 'Dibrugarh', 'Golaghat', 'Guwahati', 'Jorhat', 'Kamrup', 'Nagaon', 'Silchar', 'Tinsukia'],
  Bihar: ['Araria', 'Bhagalpur', 'Darbhanga', 'Gaya', 'Katihar', 'Muzaffarpur', 'Nalanda', 'Patna', 'Purnia', 'Samastipur'],
  Chhattisgarh: ['Balod', 'Bastar', 'Bilaspur', 'Dhamtari', 'Durg', 'Janjgir-Champa', 'Korba', 'Raigarh', 'Raipur', 'Rajnandgaon'],
  Goa: ['North Goa', 'South Goa'],
  Gujarat: ['Ahmedabad', 'Anand', 'Bhavnagar', 'Gandhinagar', 'Jamnagar', 'Kutch', 'Rajkot', 'Surat', 'Vadodara', 'Valsad'],
  Haryana: ['Ambala', 'Faridabad', 'Gurugram', 'Hisar', 'Jhajjar', 'Karnal', 'Kurukshetra', 'Panipat', 'Rohtak', 'Sonipat'],
  'Himachal Pradesh': ['Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kullu', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una'],
  Jharkhand: ['Bokaro', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Hazaribagh', 'Palamu', 'Ranchi', 'Saraikela Kharsawan', 'West Singhbhum'],
  Karnataka: ['Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Davanagere', 'Dharwad', 'Kalaburagi', 'Mysuru', 'Udupi'],
  Kerala: ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Thiruvananthapuram'],
  'Madhya Pradesh': ['Bhopal', 'Gwalior', 'Indore', 'Jabalpur', 'Khandwa', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Ujjain'],
  Maharashtra: ['Ahmednagar', 'Aurangabad', 'Kolhapur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nashik', 'Pune', 'Solapur', 'Thane'],
  Manipur: ['Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Senapati', 'Tamenglong', 'Ukhrul'],
  Meghalaya: ['East Garo Hills', 'East Khasi Hills', 'Jaintia Hills', 'Ri-Bhoi', 'South Garo Hills', 'West Garo Hills', 'West Khasi Hills'],
  Mizoram: ['Aizawl', 'Champhai', 'Kolasib', 'Lawngtlai', 'Lunglei', 'Mamit', 'Saiha', 'Serchhip'],
  Nagaland: ['Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung', 'Mon', 'Phek', 'Tuensang', 'Wokha', 'Zunheboto'],
  Odisha: ['Balangir', 'Cuttack', 'Ganjam', 'Jagatsinghpur', 'Jharsuguda', 'Khordha', 'Mayurbhanj', 'Puri', 'Sambalpur', 'Sundargarh'],
  Punjab: ['Amritsar', 'Bathinda', 'Firozpur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Ludhiana', 'Mohali', 'Patiala', 'Sangrur'],
  Rajasthan: ['Ajmer', 'Alwar', 'Bikaner', 'Jaipur', 'Jodhpur', 'Kota', 'Pali', 'Sikar', 'Udaipur', 'Sri Ganganagar'],
  Sikkim: ['East Sikkim', 'North Sikkim', 'South Sikkim', 'West Sikkim'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Cuddalore', 'Erode', 'Kanchipuram', 'Madurai', 'Salem', 'Thanjavur', 'Tiruchirappalli', 'Tirunelveli'],
  Telangana: ['Adilabad', 'Hyderabad', 'Karimnagar', 'Khammam', 'Mahabubnagar', 'Medchal', 'Nalgonda', 'Nizamabad', 'Rangareddy', 'Warangal'],
  Tripura: ['Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala', 'South Tripura', 'Unakoti', 'West Tripura'],
  'Uttar Pradesh': ['Agra', 'Aligarh', 'Allahabad', 'Bareilly', 'Ghaziabad', 'Gorakhpur', 'Kanpur Nagar', 'Lucknow', 'Meerut', 'Varanasi'],
  Uttarakhand: ['Almora', 'Dehradun', 'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Tehri Garhwal', 'Udham Singh Nagar'],
  'West Bengal': ['Alipurduar', 'Bankura', 'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Kolkata', 'Murshidabad', 'North 24 Parganas', 'South 24 Parganas'],
  'Andaman and Nicobar Islands': ['Nicobar', 'North and Middle Andaman', 'South Andaman'],
  Chandigarh: ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Dadra and Nagar Haveli', 'Daman', 'Diu'],
  Delhi: ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North West Delhi', 'Shahdara', 'South Delhi', 'West Delhi'],
  'Jammu and Kashmir': ['Anantnag', 'Baramulla', 'Budgam', 'Jammu', 'Kathua', 'Kupwara', 'Pulwama', 'Srinagar', 'Udhampur'],
  Ladakh: ['Kargil', 'Leh'],
  Lakshadweep: ['Agatti', 'Amini', 'Kavaratti', 'Minicoy'],
  Puducherry: ['Karaikal', 'Mahe', 'Puducherry', 'Yanam']
};

const initialConsultationForm = {
  prescriptionFileTitle: '',
  prescriptionFileData: '',
  prescriptionFileName: '',
  prescriptionFileType: '',
  labReportTitle: '',
  labReportText: '',
  labReportFileData: '',
  labReportFileName: '',
  labReportFileType: ''
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
  const [actionMessage, setActionMessage] = useState('');
  const [bookForm, setBookForm] = useState(initialBookForm);
  const [showBookForm, setShowBookForm] = useState(false);
  const [doctorsInfoMessage, setDoctorsInfoMessage] = useState('');
  const [bookingOptions, setBookingOptions] = useState({
    states: [],
    districts: [],
    hospitals: [],
    specializations: [],
    nearbyState: null
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [consultationForm, setConsultationForm] = useState(initialConsultationForm);
  const [labReportAnalysis, setLabReportAnalysis] = useState(null);
  const [labReportAnalyzing, setLabReportAnalyzing] = useState(false);

  const isPatient = user?.role === 'patient';
  const isDoctor = user?.role === 'doctor';

  const loadAppointments = async (selectedStatus = statusFilter) => {
    try {
      setLoading(true);
      setError('');
      const response = await appointmentsAPI.getAll({
        limit: 50,
        ...(selectedStatus ? { status: selectedStatus } : {})
      });
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
        ...(filters.district ? { district: filters.district } : {}),
        ...(filters.hospital ? { hospital: filters.hospital } : {}),
        ...(filters.specialization ? { specialization: filters.specialization } : {})
      });

      const options = response?.data || {};
      const doctorRows = options?.doctors || [];

      setBookingOptions({
        states: options.states || [],
        districts: options.districts || [],
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

  const onStatusFilterChange = async (event) => {
    const nextStatus = event.target.value;
    setStatusFilter(nextStatus);
    await loadAppointments(nextStatus);
  };

  const summary = useMemo(() => {
    return {
      total: appointments.length,
      upcoming: appointments.filter((item) => ['payment_submitted', 'scheduled', 'confirmed'].includes(item.status)).length,
      completed: appointments.filter((item) => item.status === 'completed').length,
      cancelled: appointments.filter((item) => item.status === 'cancelled').length
    };
  }, [appointments]);

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor._id === bookForm.doctorId) || null,
    [doctors, bookForm.doctorId]
  );

  const isDoctorPaymentReady = Boolean(selectedDoctor?.paymentDetails?.upiId);

  const districtOptions = useMemo(() => {
    if (!bookForm.state) return [];

    const stateDistricts = INDIAN_DISTRICTS_BY_STATE[bookForm.state] || [];
    const backendDistricts = bookingOptions.districts || [];

    return Array.from(new Set([...stateDistricts, ...backendDistricts]))
      .map((district) => String(district).trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [bookForm.state, bookingOptions.districts]);

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

  const fetchAvailableSlots = async (doctorId, selectedDate, doctorFallback) => {
    if (!doctorId || !selectedDate) {
      setAvailableSlots([]);
      return;
    }

    try {
      const response = await doctorsAPI.getAvailability(doctorId, selectedDate);
      const serverSlots = (response?.data || []).map((slot) => ({
        key: `timeslot-${slot.startTime}-${slot.endTime}`,
        label: `${slot.startTime} - ${slot.endTime}`,
        startTime: slot.startTime,
        endTime: slot.endTime
      }));

      if (serverSlots.length > 0) {
        setAvailableSlots(serverSlots);
        return;
      }
    } catch (slotError) {
      console.error('Failed to fetch doctor slots:', slotError);
    }

    setAvailableSlots(computeAvailableSlots(doctorFallback, selectedDate));
  };

  useEffect(() => {
    if (!bookForm.doctorId || !bookForm.date) {
      setAvailableSlots([]);
      return;
    }

    const selectedDoctor = doctors.find((doctor) => doctor._id === bookForm.doctorId);
    fetchAvailableSlots(bookForm.doctorId, bookForm.date, selectedDoctor);
  }, [bookForm.doctorId, bookForm.date, doctors]);

  const onBookChange = (event) => {
    const { name, value } = event.target;

    if (name === 'state') {
      const nextForm = {
        ...bookForm,
        state: value,
        district: '',
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

    if (name === 'district' || name === 'hospital' || name === 'specialization') {
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

  const onReceiptFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setBookForm((prev) => ({
        ...prev,
        paymentReceiptImage: '',
        paymentReceiptName: ''
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setBookForm((prev) => ({
        ...prev,
        paymentReceiptImage: typeof reader.result === 'string' ? reader.result : '',
        paymentReceiptName: file.name
      }));
    };
    reader.readAsDataURL(file);
  };

  const submitBookAppointment = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setActionMessage('');

    try {
      await appointmentsAPI.create({
        doctorId: bookForm.doctorId,
        date: bookForm.date,
        startTime: bookForm.startTime,
        endTime: bookForm.endTime,
        paymentUtr: bookForm.paymentUtr,
        paymentReceiptImage: bookForm.paymentReceiptImage,
        paymentReceiptName: bookForm.paymentReceiptName,
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
    setActionMessage('');

    try {
      await appointmentsAPI.updateStatus(appointmentId, status);
      await loadAppointments();
    } catch (statusError) {
      setError(statusError?.message || 'Failed to update appointment status');
    } finally {
      setSubmitting(false);
    }
  };

  const sendToPharmacyEmergency = async (appointmentId) => {
    setSubmitting(true);
    setError('');
    setActionMessage('');

    try {
      const response = await appointmentsAPI.sendPrescriptionToPharmacy(appointmentId, {
        emergencyPrePack: true
      });
      const successMessage = response?.message || 'Emergency pre-pack request sent to pharmacy successfully.';
      setActionMessage(successMessage);
      window.alert(successMessage);
      await loadAppointments();
    } catch (sendError) {
      const failMessage = sendError?.message || 'Failed to send emergency pre-pack request';
      setError(failMessage);
      window.alert(failMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const viewPharmacyOrderStatus = async (appointmentId) => {
    setSubmitting(true);
    setError('');
    setActionMessage('');

    try {
      const response = await appointmentsAPI.getPharmacyOrderStatus(appointmentId);
      const order = response?.data || {};
      const normalizedStatus = String(order.status || '').toLowerCase();
      const pickupInstruction = ['completed', 'ready'].includes(normalizedStatus)
        ? (order.statusMessage || 'The medicines are packed..came and take the order.')
        : null;

      const details = [
        `Order ID: ${order.orderId || '-'}`,
        `Status: ${order.status || '-'}`,
        pickupInstruction ? `Message: ${pickupInstruction}` : null,
        `Priority: ${order.priority || '-'}`,
        `Emergency Pre-Pack: ${order.emergencyPrePack ? 'Yes' : 'No'}`,
        `Assigned Pharmacist: ${order.assignedPharmacist || 'Not assigned yet'}`,
        `Estimated Ready Time: ${order.estimatedReadyTime ? new Date(order.estimatedReadyTime).toLocaleString() : 'Not available yet'}`,
        `Last Updated: ${order.updatedAt ? new Date(order.updatedAt).toLocaleString() : '-'}`
      ].filter(Boolean).join('\n');

      setActionMessage('Pharmacy order status fetched successfully.');
      window.alert(details);

      if (normalizedStatus === 'completed' && pickupInstruction) {
        window.alert(pickupInstruction);
      }
    } catch (statusError) {
      const failMessage = statusError?.message || 'Unable to fetch pharmacy order status right now.';
      setError(failMessage);
      window.alert(failMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const mapAppointmentToConsultationForm = (appointment) => {
    return {
      prescriptionFileTitle: '',
      prescriptionFileData: '',
      prescriptionFileName: '',
      prescriptionFileType: '',
      labReportTitle: '',
      labReportFileData: '',
      labReportFileName: '',
      labReportFileType: ''
    };
  };

  const openConsultationWorkspace = async (appointment, markInProgress = false) => {
    setSubmitting(true);
    setError('');
    setActionMessage('');

    try {
      if (markInProgress) {
        await appointmentsAPI.updateStatus(appointment._id, 'in_progress');
      }

      const appointmentResponse = await appointmentsAPI.getById(appointment._id);
      const currentAppointment = appointmentResponse?.data || appointment;

      setSelectedAppointment(currentAppointment);
      setConsultationForm(mapAppointmentToConsultationForm(currentAppointment));
      setLabReportAnalysis(null);
      await loadAppointments();
    } catch (workspaceError) {
      setError(workspaceError?.message || 'Failed to open prescription workspace');
    } finally {
      setSubmitting(false);
    }
  };

  const analyzeLabReportFromForm = async (draft) => {
    const payload = {
      title: String(draft?.labReportTitle || '').trim(),
      fileName: String(draft?.labReportFileName || '').trim(),
      fileData: String(draft?.labReportFileData || '').trim(),
      mimeType: String(draft?.labReportFileType || '').trim(),
      reportText: String(draft?.labReportText || '').trim()
    };

    if (!payload.fileData && !payload.reportText) {
      setError('Upload a lab report file or add report text before infection analysis.');
      return;
    }

    setLabReportAnalyzing(true);
    setError('');

    try {
      const response = await appointmentsAPI.analyzeLabReport(payload);
      setLabReportAnalysis(response?.data || null);
    } catch (analysisError) {
      setLabReportAnalysis(null);
      setError(analysisError?.message || 'Failed to analyze infection percentage from lab report');
    } finally {
      setLabReportAnalyzing(false);
    }
  };

  const onLabReportFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setConsultationForm((prev) => ({
        ...prev,
        labReportFileData: '',
        labReportFileName: '',
        labReportFileType: ''
      }));
      setLabReportAnalysis(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const nextData = typeof reader.result === 'string' ? reader.result : '';
      const nextDraft = {
        ...consultationForm,
        labReportFileData: nextData,
        labReportFileName: file.name,
        labReportFileType: file.type || ''
      };

      setConsultationForm((prev) => ({
        ...prev,
        labReportFileData: nextData,
        labReportFileName: file.name,
        labReportFileType: file.type || ''
      }));

      analyzeLabReportFromForm(nextDraft);
    };
    reader.readAsDataURL(file);
  };

  const onPrescriptionFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setConsultationForm((prev) => ({
        ...prev,
        prescriptionFileData: '',
        prescriptionFileName: '',
        prescriptionFileType: ''
      }));
      return;
    }

    if (!file.type?.startsWith('image/')) {
      setError('Prescription upload supports images only.');
      setConsultationForm((prev) => ({
        ...prev,
        prescriptionFileData: '',
        prescriptionFileName: '',
        prescriptionFileType: ''
      }));
      return;
    }

    setError('');

    const reader = new FileReader();
    reader.onload = () => {
      setConsultationForm((prev) => ({
        ...prev,
        prescriptionFileData: typeof reader.result === 'string' ? reader.result : '',
        prescriptionFileName: file.name,
        prescriptionFileType: file.type || ''
      }));
    };
    reader.readAsDataURL(file);
  };

  const submitConsultationDetails = async (event) => {
    event.preventDefault();
    if (!selectedAppointment?._id) return;

    setSubmitting(true);
    setError('');
    setActionMessage('');

    try {
      const hasPrescriptionFile = Boolean(consultationForm.prescriptionFileData);
      const hasLabReport = Boolean(consultationForm.labReportFileData);

      if (!hasPrescriptionFile && !hasLabReport) {
        setError('Upload a prescription image or upload a lab report before saving.');
        return;
      }

      await appointmentsAPI.updateConsultation(selectedAppointment._id, {
        prescriptionFile: hasPrescriptionFile
          ? {
            title: consultationForm.prescriptionFileTitle.trim(),
            fileName: consultationForm.prescriptionFileName,
            fileData: consultationForm.prescriptionFileData,
            mimeType: consultationForm.prescriptionFileType
          }
          : undefined,
        labReport: hasLabReport
          ? {
            title: consultationForm.labReportTitle.trim(),
            reportText: consultationForm.labReportText.trim(),
            fileName: consultationForm.labReportFileName,
            fileData: consultationForm.labReportFileData,
            mimeType: consultationForm.labReportFileType
          }
          : undefined
      });

      setSelectedAppointment(null);
      setConsultationForm(initialConsultationForm);
      setLabReportAnalysis(null);
      setActionMessage('Prescription/lab report saved successfully.');
      await loadAppointments();
    } catch (saveError) {
      setError(saveError?.message || 'Failed to save prescription image or lab report');
    } finally {
      setSubmitting(false);
    }
  };

  const canSendSelectedAppointmentEmergency =
    Boolean(selectedAppointment?._id) &&
    !['cancelled', 'no_show'].includes(selectedAppointment?.status) &&
    (
      (selectedAppointment?.prescription?.medicines?.length || 0) > 0 ||
      (selectedAppointment?.prescriptionFiles?.length || 0) > 0 ||
      Boolean(consultationForm?.prescriptionFileData)
    );

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

        {actionMessage && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-700">
            {actionMessage}
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
                  <option value=""> Select State</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">District (optional)</label>
                <select
                  name="district"
                  value={bookForm.district}
                  onChange={onBookChange}
                  required={Boolean(bookForm.state)}
                  disabled={!bookForm.state || districtOptions.length === 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{bookForm.state ? 'All districts' : 'Select state first'}</option>
                  {districtOptions.map((district) => (
                    <option key={district} value={district}>{district}</option>
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

              {selectedDoctor && (
                <div className="md:col-span-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-sm font-medium text-blue-900">Doctor Payment Details</p>
                  <p className="mt-1 text-sm font-semibold text-blue-900">Amount to Pay: ₹{selectedDoctor?.consultationFee || 0}</p>
                  <p className="mt-1 text-sm text-blue-800">UPI ID: {selectedDoctor?.paymentDetails?.upiId || 'Not configured by doctor'}</p>
                  {selectedDoctor?.paymentDetails?.upiQrCode && (
                    <img
                      src={selectedDoctor.paymentDetails.upiQrCode}
                      alt="Doctor UPI scanner"
                      className="mt-2 h-36 w-36 rounded border border-blue-200 object-cover"
                    />
                  )}
                  {!isDoctorPaymentReady && (
                    <p className="mt-2 text-xs text-red-700">Doctor has not added UPI details yet. You cannot submit payment proof for this doctor.</p>
                  )}
                </div>
              )}

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

              <Input
                name="paymentUtr"
                label="UTR Number"
                value={bookForm.paymentUtr}
                onChange={onBookChange}
                placeholder="Enter UTR after UPI payment"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Receipt (image)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onReceiptFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                {bookForm.paymentReceiptName && (
                  <p className="mt-1 text-xs text-gray-600">Selected: {bookForm.paymentReceiptName}</p>
                )}
              </div>

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
                <Button
                  type="submit"
                  loading={submitting}
                  disabled={!isDoctorPaymentReady || !bookForm.paymentReceiptImage}
                >
                  Submit Payment & Request Appointment
                </Button>
              </div>
            </form>
          </section>
        )}

        <section className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Appointment List</h2>
            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={onStatusFilterChange}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="payment_submitted">Pending Acceptance</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
              <span className="text-sm text-gray-500">{appointments.length} records</span>
            </div>
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
                      {appointment?.paymentProof?.utrNumber && (
                        <p className="text-sm text-gray-700">UTR: {appointment.paymentProof.utrNumber}</p>
                      )}
                      {isPatient && appointment.status === 'cancelled' && appointment.paymentStatus === 'rejected' && (
                        <p className="text-sm text-amber-700">Your amount will be refunded to you within 2-3 days.</p>
                      )}
                      {appointment?.paymentProof?.receiptUrl && (
                        <a
                          href={appointment.paymentProof.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-700 underline"
                        >
                          View receipt link
                        </a>
                      )}
                      {appointment?.prescription?.medicines?.length > 0 && (
                        <p className="text-sm text-gray-700">
                          Prescription: {appointment.prescription.medicines.map((medicine) => medicine.name).join(', ')}
                        </p>
                      )}
                      {appointment?.prescriptionFiles?.length > 0 && (
                        <div className="text-sm text-gray-700">
                          <p className="font-medium">Prescription Files:</p>
                          <div className="mt-1 space-y-1">
                            {appointment.prescriptionFiles.map((prescriptionFile, prescriptionIndex) => (
                              <a
                                key={`${appointment._id}-prescription-${prescriptionIndex}`}
                                href={prescriptionFile.fileUrl || prescriptionFile.fileData}
                                target="_blank"
                                rel="noreferrer"
                                className="block text-blue-700 underline"
                              >
                                {prescriptionFile.title || prescriptionFile.fileName || `Prescription ${prescriptionIndex + 1}`}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {appointment?.prescriptionFiles?.length > 0 && !appointment?.prescription?.medicines?.length && (
                        <p className="text-sm text-emerald-700">
                          Prescription image uploaded. You can send emergency pre-pack request and pharmacist will verify medicines from this image.
                        </p>
                      )}
                      {appointment?.labReports?.length > 0 && (
                        <div className="text-sm text-gray-700">
                          <p className="font-medium">Lab Reports:</p>
                          <div className="mt-1 space-y-1">
                            {appointment.labReports.map((report, reportIndex) => (
                              <div key={`${appointment._id}-report-${reportIndex}`} className="rounded border border-gray-100 p-2">
                                <a
                                  href={report.fileUrl || report.fileData}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block text-blue-700 underline"
                                >
                                  {report.title || report.fileName || `Lab Report ${reportIndex + 1}`}
                                </a>
                                {typeof report?.infectionAnalysis?.percentage === 'number' && (
                                  <p className="mt-1 text-xs text-rose-700">
                                    Infection likelihood: {report.infectionAnalysis.percentage}% ({report.infectionAnalysis.riskLevel || 'risk unknown'})
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-start gap-2 sm:items-end sm:min-w-[18rem]">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {String(appointment.status || '').replace('_', ' ')}
                      </span>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">

                      {isPatient && ['payment_submitted', 'scheduled'].includes(appointment.status) && (
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
                          onClick={() => openConsultationWorkspace(appointment, true)}
                          loading={submitting}
                        >
                          Start & Prescribe
                        </Button>
                      )}

                      {isDoctor && appointment.status === 'payment_submitted' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedPaymentRequest(appointment)}
                          >
                            View Payment Details
                          </Button>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => updateStatus(appointment._id, 'confirmed')}
                            loading={submitting}
                          >
                            Approve Payment
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => updateStatus(appointment._id, 'cancelled')}
                            loading={submitting}
                          >
                            Reject Request
                          </Button>
                        </>
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
                          onClick={() => openConsultationWorkspace(appointment, false)}
                        >
                          Prescription
                        </Button>
                      )}

                      {(isPatient || isDoctor) && (appointment?.prescription?.medicines?.length > 0 || appointment?.prescriptionFiles?.length > 0) && !['cancelled', 'no_show'].includes(appointment.status) && (
                        <Link to={`/appointments/send-to-pharmacy?appointmentId=${appointment._id}`}>
                          <Button
                            size="sm"
                            variant="danger"
                          >
                            Choose Pharmacy & Send
                          </Button>
                        </Link>
                      )}

                      {(isPatient || isDoctor) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewPharmacyOrderStatus(appointment._id)}
                          loading={submitting}
                        >
                          View Order Status
                        </Button>
                      )}
                      </div>
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
          setConsultationForm(initialConsultationForm);
          setLabReportAnalysis(null);
        }}
        title="Upload Prescription"
      >
        <form onSubmit={submitConsultationDetails} className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            <p><span className="font-medium">Patient:</span> {selectedAppointment?.patientId?.name || 'N/A'}</p>
            <p><span className="font-medium">Email:</span> {selectedAppointment?.patientId?.email || 'N/A'}</p>
            <p><span className="font-medium">Phone:</span> {selectedAppointment?.patientId?.phone || 'N/A'}</p>
            <p><span className="font-medium">Age/Gender:</span> {selectedAppointment?.patientId?.age || 'N/A'} / {selectedAppointment?.patientId?.gender || 'N/A'}</p>
            <p><span className="font-medium">Symptoms:</span> {selectedAppointment?.symptoms?.join(', ') || 'None reported'}</p>
            <p><span className="font-medium">Description:</span> {selectedAppointment?.description || 'No additional description'}</p>

            {Array.isArray(selectedAppointment?.prescriptionFiles) && selectedAppointment.prescriptionFiles.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Uploaded Prescriptions:</p>
                <div className="mt-1 space-y-1">
                  {selectedAppointment.prescriptionFiles.map((prescriptionFile, index) => (
                    <a
                      key={`${selectedAppointment?._id || 'appointment'}-modal-prescription-${index}`}
                      href={prescriptionFile.fileUrl || prescriptionFile.fileData}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-blue-700 underline"
                    >
                      {prescriptionFile.title || prescriptionFile.fileName || `Prescription ${index + 1}`}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 p-3 space-y-3">
            <p className="text-sm font-medium text-gray-800">Prescription File Upload</p>
            <Input
              label="Prescription Title"
              value={consultationForm.prescriptionFileTitle}
              onChange={(event) => setConsultationForm((prev) => ({ ...prev, prescriptionFileTitle: event.target.value }))}
              placeholder="Prescription - Fever"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload Prescription</label>
              <input
                type="file"
                accept="image/*"
                onChange={onPrescriptionFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              {consultationForm.prescriptionFileName && (
                <p className="mt-1 text-xs text-gray-600">Selected: {consultationForm.prescriptionFileName}</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-3 space-y-3">
            <p className="text-sm font-medium text-gray-800">Lab Report Upload</p>
            <Input
              label="Report Title"
              value={consultationForm.labReportTitle}
              onChange={(event) => setConsultationForm((prev) => ({ ...prev, labReportTitle: event.target.value }))}
              placeholder="CBC Report"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Text (recommended for better AI accuracy)</label>
              <textarea
                value={consultationForm.labReportText}
                onChange={(event) => setConsultationForm((prev) => ({ ...prev, labReportText: event.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paste key values (example: WBC 16000, CRP 35, ESR 45...)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload Lab Report</label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={onLabReportFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              {consultationForm.labReportFileName && (
                <p className="mt-1 text-xs text-gray-600">Selected: {consultationForm.labReportFileName}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => analyzeLabReportFromForm(consultationForm)}
                loading={labReportAnalyzing}
              >
                Analyze Infection %
              </Button>
              {labReportAnalysis?.infectionAssessment?.percentage !== null && labReportAnalysis?.infectionAssessment?.percentage !== undefined && (
                <p className="text-sm text-rose-700 font-medium">
                  Infection likelihood: {labReportAnalysis.infectionAssessment.percentage}%
                </p>
              )}
            </div>
            {labReportAnalysis?.infectionAssessment?.summary && (
              <p className="text-xs text-gray-600">{labReportAnalysis.infectionAssessment.summary}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {isDoctor && canSendSelectedAppointmentEmergency && (
              <Link to={`/appointments/send-to-pharmacy?appointmentId=${selectedAppointment._id}`}>
                <Button
                  type="button"
                  variant="danger"
                >
                  Choose Pharmacy & Send
                </Button>
              </Link>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedAppointment(null);
                setConsultationForm(initialConsultationForm);
              }}
            >
              Close
            </Button>
            <Button type="submit" loading={submitting}>Save Prescription</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(selectedPaymentRequest)}
        onClose={() => setSelectedPaymentRequest(null)}
        title="Payment Validation Details"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Patient:</span> {selectedPaymentRequest?.patientId?.name || 'N/A'}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Date & Slot:</span>{' '}
            {selectedPaymentRequest?.date ? new Date(selectedPaymentRequest.date).toLocaleDateString() : 'N/A'}
            {' • '}
            {selectedPaymentRequest?.startTime || '--:--'} - {selectedPaymentRequest?.endTime || '--:--'}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Amount Paid:</span> ₹{selectedPaymentRequest?.consultationFee || 0}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">UTR Number:</span> {selectedPaymentRequest?.paymentProof?.utrNumber || selectedPaymentRequest?.paymentId || 'N/A'}
          </p>

          {selectedPaymentRequest?.paymentProof?.receiptImage ? (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Uploaded Receipt</p>
              <img
                src={selectedPaymentRequest.paymentProof.receiptImage}
                alt="Uploaded payment receipt"
                className="max-h-72 w-full rounded-lg border border-gray-200 object-contain"
              />
            </div>
          ) : (
            <p className="text-sm text-amber-700">No uploaded receipt image found for this request.</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setSelectedPaymentRequest(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Appointments;
