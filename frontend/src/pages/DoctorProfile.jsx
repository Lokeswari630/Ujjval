import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProfileCard from '../components/ProfileCard';
import InfoSection from '../components/InfoSection';
import Button from '../components/Button';
import { doctorsAPI } from '../services/api';

const SPECIALIZATIONS = [
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Dermatology',
  'Gynecology',
  'Psychiatry',
  'General Medicine',
  'ENT',
  'Ophthalmology',
  'Dentistry',
  'Urology',
  'Gastroenterology',
  'Endocrinology',
  'Pulmonology',
  'Nephrology',
  'Rheumatology',
  'Oncology',
  'Anesthesiology',
  'Radiology'
];

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

const DoctorProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    specialization: '',
    state: '',
    district: '',
    experience: '',
    consultationFee: '',
    upiId: '',
    upiQrCode: '',
    maxAppointmentsPerSlot: '1',
    hospital: '',
    bio: '',
    licenseNumber: '',
    qualificationDegree: '',
    qualificationInstitution: '',
    qualificationYear: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [availabilityForm, setAvailabilityForm] = useState({
    day: 'Monday',
    startTime: '09:00',
    endTime: '13:00'
  });

  const details = useMemo(() => {
    if (!profile) return [];

    return [
      { label: 'Specialization', value: profile.specialization || '-' },
      { label: 'Experience', value: typeof profile.experience === 'number' ? `${profile.experience} years` : '-' },
      {
        label: 'Consultation Fee',
        value: typeof profile.consultationFee === 'number' ? `₹${profile.consultationFee}` : '-'
      },
      { label: 'UPI ID', value: profile?.paymentDetails?.upiId || '-' },
      { label: 'Slot Capacity', value: `${profile?.maxAppointmentsPerSlot || 1} per slot` },
      { label: 'State', value: profile?.userId?.address?.state || '-' },
      { label: 'District', value: profile?.userId?.address?.city || '-' },
      { label: 'Hospital', value: profile.hospital || '-' },
      { label: 'License Number', value: profile.licenseNumber || '-' }
    ];
  }, [profile]);

  const districtOptions = useMemo(() => {
    if (!form.state) return [];
    return INDIAN_DISTRICTS_BY_STATE[form.state] || [];
  }, [form.state]);

  const extractErrorMessage = (err, fallback) => {
    if (!err) return fallback;
    if (typeof err === 'string') return err;
    if (typeof err.message === 'string') return err.message;
    if (Array.isArray(err.errors) && err.errors[0]?.msg) return err.errors[0].msg;
    return fallback;
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await doctorsAPI.getProfile();
      const doctor = response?.data || null;

      setProfile(doctor);
      setForm({
        specialization: doctor?.specialization || '',
        state: doctor?.userId?.address?.state || '',
        district: doctor?.userId?.address?.city || '',
        experience: doctor?.experience?.toString() || '',
        consultationFee: doctor?.consultationFee?.toString() || '',
        upiId: doctor?.paymentDetails?.upiId || '',
        upiQrCode: doctor?.paymentDetails?.upiQrCode || '',
        maxAppointmentsPerSlot: (doctor?.maxAppointmentsPerSlot || 1).toString(),
        hospital: doctor?.hospital || '',
        bio: doctor?.bio || '',
        licenseNumber: doctor?.licenseNumber || '',
        qualificationDegree: doctor?.qualifications?.[0]?.degree || '',
        qualificationInstitution: doctor?.qualifications?.[0]?.institution || '',
        qualificationYear: doctor?.qualifications?.[0]?.year?.toString() || ''
      });
      setAvailabilitySlots(doctor?.availability || []);
    } catch (err) {
      const errMessage = extractErrorMessage(err, 'Unable to load doctor profile');
      setError(errMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const onChange = (event) => {
    const { name, value } = event.target;

    if (name === 'state') {
      setForm((prev) => ({ ...prev, state: value, district: '' }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onScannerFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        upiQrCode: typeof reader.result === 'string' ? reader.result : prev.upiQrCode
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!profile?._id) {
      setError('Doctor profile not found. Please create your profile first.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const payload = {
        specialization: form.specialization,
        state: form.state,
        district: form.district,
        experience: Number(form.experience),
        consultationFee: Number(form.consultationFee),
        paymentDetails: {
          upiId: form.upiId,
          upiQrCode: form.upiQrCode
        },
        maxAppointmentsPerSlot: Number(form.maxAppointmentsPerSlot || 1),
        hospital: form.hospital,
        bio: form.bio
      };

      const response = await doctorsAPI.updateProfile(profile._id, payload);
      const updatedProfile = response?.data || profile;
      setProfile(updatedProfile);
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProfile = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const payload = {
        specialization: form.specialization,
        state: form.state,
        district: form.district,
        experience: Number(form.experience),
        consultationFee: Number(form.consultationFee),
        paymentDetails: {
          upiId: form.upiId,
          upiQrCode: form.upiQrCode
        },
        maxAppointmentsPerSlot: Number(form.maxAppointmentsPerSlot || 1),
        hospital: form.hospital,
        bio: form.bio,
        licenseNumber: form.licenseNumber,
        qualifications: [
          {
            degree: form.qualificationDegree,
            institution: form.qualificationInstitution,
            year: Number(form.qualificationYear)
          }
        ]
      };

      await doctorsAPI.createProfile(payload);
      await loadProfile();
      setMessage('Profile created successfully.');
      navigate('/doctor');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to create profile'));
    } finally {
      setSaving(false);
    }
  };

  const addAvailabilitySlot = () => {
    if (!availabilityForm.day || !availabilityForm.startTime || !availabilityForm.endTime) {
      return;
    }

    setAvailabilitySlots((prev) => ([
      ...prev,
      {
        day: availabilityForm.day,
        startTime: availabilityForm.startTime,
        endTime: availabilityForm.endTime,
        isAvailable: true
      }
    ]));
  };

  const removeAvailabilitySlot = (indexToRemove) => {
    setAvailabilitySlots((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const saveAvailability = async () => {
    if (!profile?._id) return;

    try {
      setSaving(true);
      setError('');
      setMessage('');

      await doctorsAPI.updateAvailability(profile._id, {
        availability: availabilitySlots
      });

      setMessage('Availability updated successfully.');
    } catch (saveError) {
      setError(extractErrorMessage(saveError, 'Failed to update availability'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <Link to="/doctor">
            <Button variant="secondary" type="button">Back to Dashboard</Button>
          </Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 text-sm text-gray-600">Loading profile...</div>
        ) : !profile ? (
          <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900">Create Doctor Profile</h3>
            <p className="mt-1 text-sm text-amber-800">Doctor profile not found. Fill details below to create your profile.</p>

            <form className="mt-4 space-y-4" onSubmit={handleCreateProfile}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                <select
                  name="specialization"
                  value={form.specialization}
                  onChange={onChange}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="" disabled>Select specialization</option>
                  {SPECIALIZATIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <select
                    name="state"
                    value={form.state}
                    onChange={onChange}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                  >
                    <option value="" disabled>Select state</option>
                    {INDIAN_STATES.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                  <select
                    name="district"
                    value={form.district}
                    onChange={onChange}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                    disabled={!form.state}
                  >
                    <option value="" disabled>{form.state ? 'Select district' : 'Select state first'}</option>
                    {districtOptions.map((district) => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experience (years)</label>
                  <input
                    name="experience"
                    type="number"
                    min="0"
                    value={form.experience}
                    onChange={onChange}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee (₹)</label>
                  <input
                    name="consultationFee"
                    type="number"
                    min="0"
                    value={form.consultationFee}
                    onChange={onChange}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hospital</label>
                  <input
                    name="hospital"
                    value={form.hospital}
                    onChange={onChange}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Hospital name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                  <input
                    name="upiId"
                    value={form.upiId}
                    onChange={onChange}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="name@bank"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UPI Scanner Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onScannerFileChange}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  {form.upiQrCode && (
                    <img
                      src={form.upiQrCode}
                      alt="UPI scanner preview"
                      className="mt-2 h-28 w-28 rounded border border-gray-200 object-cover"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Appointments Per Slot</label>
                  <input
                    name="maxAppointmentsPerSlot"
                    type="number"
                    min="1"
                    max="20"
                    value={form.maxAppointmentsPerSlot}
                    onChange={onChange}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                <input
                  name="licenseNumber"
                  value={form.licenseNumber}
                  onChange={onChange}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualification Degree</label>
                  <input
                    name="qualificationDegree"
                    value={form.qualificationDegree}
                    onChange={onChange}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                  <input
                    name="qualificationInstitution"
                    value={form.qualificationInstitution}
                    onChange={onChange}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    name="qualificationYear"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={form.qualificationYear}
                    onChange={onChange}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  name="bio"
                  rows="4"
                  value={form.bio}
                  onChange={onChange}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Tell patients about your expertise"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {message && <p className="text-sm text-green-600">{message}</p>}

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Profile'}
                </Button>
                <Link to="/doctor">
                  <Button variant="secondary" type="button">Go to Dashboard</Button>
                </Link>
              </div>
            </form>
          </div>
        ) : (
          <>
            <ProfileCard
              name={profile.userId?.name || 'Doctor'}
              role="doctor"
              details={details}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900">Edit Profile Details</h3>
                <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                    <select
                      name="specialization"
                      value={form.specialization}
                      onChange={onChange}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      required
                    >
                      <option value="" disabled>Select specialization</option>
                      {SPECIALIZATIONS.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience (years)</label>
                    <input
                      name="experience"
                      type="number"
                      min="0"
                      value={form.experience}
                      onChange={onChange}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <select
                      name="state"
                      value={form.state}
                      onChange={onChange}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      required
                    >
                      <option value="" disabled>Select state</option>
                      {INDIAN_STATES.map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                    <select
                      name="district"
                      value={form.district}
                      onChange={onChange}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      required
                      disabled={!form.state}
                    >
                      <option value="" disabled>{form.state ? 'Select district' : 'Select state first'}</option>
                      {districtOptions.map((district) => (
                        <option key={district} value={district}>{district}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee (₹)</label>
                    <input
                      name="consultationFee"
                      type="number"
                      min="0"
                      value={form.consultationFee}
                      onChange={onChange}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hospital</label>
                    <input
                      name="hospital"
                      value={form.hospital}
                      onChange={onChange}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                    <input
                      name="upiId"
                      value={form.upiId}
                      onChange={onChange}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="name@bank"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">UPI Scanner Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onScannerFileChange}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    {form.upiQrCode && (
                      <img
                        src={form.upiQrCode}
                        alt="UPI scanner preview"
                        className="mt-2 h-28 w-28 rounded border border-gray-200 object-cover"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Appointments Per Slot</label>
                    <input
                      name="maxAppointmentsPerSlot"
                      type="number"
                      min="1"
                      max="20"
                      value={form.maxAppointmentsPerSlot}
                      onChange={onChange}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                    <textarea
                      name="bio"
                      rows="4"
                      value={form.bio}
                      onChange={onChange}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Tell patients about your expertise"
                    />
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}
                  {message && <p className="text-sm text-green-600">{message}</p>}

                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Profile'}
                  </Button>
                </form>
              </div>

              <InfoSection
                title="Current Availability"
                items={availabilitySlots.length > 0
                  ? availabilitySlots.map((slot) => ({
                    label: slot.day,
                    value: `${slot.startTime} - ${slot.endTime}`
                  }))
                  : [{ label: 'No availability set', value: 'Add slots below' }]
                }
              />

              <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900">Manage Availability</h3>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={availabilityForm.day}
                    onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, day: event.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={availabilityForm.startTime}
                    onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, startTime: event.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="time"
                    value={availabilityForm.endTime}
                    onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, endTime: event.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Button type="button" onClick={addAvailabilitySlot}>Add Slot</Button>
                  <Button type="button" variant="secondary" onClick={saveAvailability} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Availability'}
                  </Button>
                </div>

                {availabilitySlots.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {availabilitySlots.map((slot, index) => (
                      <div key={`${slot.day}-${slot.startTime}-${index}`} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                        <p className="text-sm text-gray-700">{slot.day} • {slot.startTime} - {slot.endTime}</p>
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:text-red-700"
                          onClick={() => removeAvailabilitySlot(index)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DoctorProfile;
