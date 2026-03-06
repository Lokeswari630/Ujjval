import axios from 'axios';

const ensureApiPath = (baseUrl) => {
  const trimmed = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';

  // If /api is omitted in env config, append it so endpoint paths resolve correctly.
  if (/\/api$/i.test(trimmed)) {
    return trimmed;
  }

  const hasPath = /^https?:\/\//i.test(trimmed) && (() => {
    try {
      return new URL(trimmed).pathname !== '/';
    } catch {
      return false;
    }
  })();

  return hasPath ? trimmed : `${trimmed}/api`;
};

const resolveApiBaseUrl = () => {
  const configured = String(import.meta.env.VITE_API_BASE_URL || '').trim();
  if (configured) {
    return ensureApiPath(configured);
  }

  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    if (isLocalhost) {
      return 'http://localhost:5000/api';
    }

    // Production-safe fallback when env var is missing.
    return `${origin.replace(/\/$/, '')}/api`;
  }

  return 'http://localhost:5000/api';
};

// Create axios instance with base configuration
const API = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getErrorMessage = (error) => {
  if (typeof error === 'string') return error;
  return error?.message || '';
};

const isNetworkError = (error) => {
  const errorMessage = getErrorMessage(error);
  const errorCode = typeof error === 'object' ? error?.code : '';

  return errorCode === 'ERR_NETWORK' ||
    errorMessage.includes('Network Error') ||
    errorMessage.includes('ERR_CONNECTION_REFUSED');
};

const isMockAuthEnabled = import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';
const isMockDataEnabled = import.meta.env.VITE_ENABLE_MOCK_DATA === 'true';

const throwBackendUnavailable = (message) => {
  throw new Error(message);
};

// Request interceptor to add auth token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
API.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

// Mock authentication for when backend is not running
const mockAuth = {
  login: async (credentials) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Validate credentials object
    if (!credentials || !credentials.email) {
      throw new Error('Email is required');
    }
    
    // Mock user data based on email
    const mockUsers = {
      'patient@example.com': {
        id: 'patient-123',
        name: 'John Doe',
        email: 'patient@example.com',
        role: 'patient',
        phone: '+1234567890',
        age: 35,
        gender: 'male'
      },
      'doctor@example.com': {
        id: 'doctor-123',
        name: 'Dr. Sarah Smith',
        email: 'doctor@example.com',
        role: 'doctor',
        phone: '+1234567891',
        age: 42,
        gender: 'female'
      },
      'pharmacist@example.com': {
        id: 'pharmacist-123',
        name: 'Mike Johnson',
        email: 'pharmacist@example.com',
        role: 'pharmacist',
        phone: '+1234567892',
        age: 38,
        gender: 'male'
      },
      'admin@example.com': {
        id: 'admin-123',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        phone: '+1234567893',
        age: 45,
        gender: 'other'
      }
    };

    const user = mockUsers[credentials.email];
    
    if (!user) {
      throw new Error('Invalid credentials. Try: patient@example.com, doctor@example.com, pharmacist@example.com, or admin@example.com with password: password123');
    }

    if (credentials.password !== 'password123') {
      throw new Error('Invalid password. Use: password123');
    }

    return {
      success: true,
      token: 'mock-jwt-token-' + Date.now(),
      user: user
    };
  },

  register: async (userData) => {
    // Validate userData object
    if (!userData || !userData.email) {
      throw new Error('Email is required');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      token: 'mock-jwt-token-' + Date.now(),
      user: {
        id: 'user-' + Date.now(),
        ...userData,
        role: userData.role
      }
    };
  },

  getProfile: async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) {
      throw new Error('No user found');
    }
    return { data: user };
  },

  logout: async () => {
    return { success: true };
  }
};

// Mock data for other APIs
const mockData = {
  appointments: [
    {
      _id: 'apt-1',
      patientId: { name: 'John Doe', email: 'patient@example.com' },
      doctorId: { userId: { name: 'Dr. Sarah Smith', specialization: 'Cardiology' } },
      date: '2026-02-28',
      startTime: '10:00',
      endTime: '10:30',
      status: 'scheduled'
    },
    {
      _id: 'apt-2',
      patientId: { name: 'Jane Smith', email: 'patient@example.com' },
      doctorId: { userId: { name: 'Dr. Mike Johnson', specialization: 'Pediatrics' } },
      date: '2026-02-28',
      startTime: '11:00',
      endTime: '11:30',
      status: 'confirmed'
    }
  ],

  healthPredictions: [
    {
      _id: 'pred-1',
      aiAnalysis: {
        riskLevel: 'low',
        possibleConditions: ['Common Cold'],
        urgencyLevel: 'low'
      },
      predictionDate: '2026-02-27'
    },
    {
      _id: 'pred-2',
      aiAnalysis: {
        riskLevel: 'medium',
        possibleConditions: ['Seasonal Allergies'],
        urgencyLevel: 'medium'
      },
      predictionDate: '2026-02-26'
    }
  ],

  pharmacyOrders: [
    {
      _id: 'order-1',
      orderId: 'PH123456',
      patientDetails: { name: 'John Doe', phone: '+1234567890' },
      priority: 'high',
      status: 'preparing',
      medicines: [
        { name: 'Amoxicillin', quantity: 10 },
        { name: 'Paracetamol', quantity: 20 }
      ],
      preparationTime: 25
    },
    {
      _id: 'order-2',
      orderId: 'PH123457',
      patientDetails: { name: 'Jane Smith', phone: '+1234567891' },
      priority: 'medium',
      status: 'ready',
      medicines: [
        { name: 'Ibuprofen', quantity: 15 }
      ],
      preparationTime: 15
    }
  ]
};

// Auth API
export const authAPI = {
  login: async (credentials) => {
    try {
      return await API.post('/auth/login', credentials);
    } catch (error) {
      if (isMockAuthEnabled && isNetworkError(error)) {
        console.log('Backend not running, using mock authentication');
        return await mockAuth.login(credentials);
      }
      if (isNetworkError(error)) {
        throw new Error('Backend is not reachable. Start server and try again.');
      }
      throw error;
    }
  },
  register: async (userData) => {
    try {
      return await API.post('/auth/register', userData);
    } catch (error) {
      if (isMockAuthEnabled && isNetworkError(error)) {
        console.log('Backend not running, using mock authentication');
        return await mockAuth.register(userData);
      }
      if (isNetworkError(error)) {
        throw new Error('Backend is not reachable. Registration was not saved.');
      }
      throw error;
    }
  },
  getProfile: async () => {
    try {
      return await API.get('/auth/me');
    } catch (error) {
      if (isMockAuthEnabled && isNetworkError(error)) {
        return await mockAuth.getProfile();
      }
      throw error;
    }
  },
  updateProfile: (userData) => API.put('/auth/profile', userData),
  logout: async () => {
    try {
      return await API.get('/auth/logout');
    } catch (error) {
      if (isMockAuthEnabled && isNetworkError(error)) {
        return await mockAuth.logout();
      }
      throw error;
    }
  },
};

// Appointments API
export const appointmentsAPI = {
  getAll: async (params) => {
    try {
      return await API.get('/appointments', { params });
    } catch (error) {
      if (isMockDataEnabled && isNetworkError(error)) {
        return { data: mockData.appointments };
      }
      if (isNetworkError(error)) {
        throwBackendUnavailable('Appointments service is unreachable. Start backend and try again.');
      }
      throw error;
    }
  },
  getById: (id) => API.get(`/appointments/${id}`),
  create: (appointmentData) => API.post('/appointments', appointmentData),
  update: (id, data) => API.patch(`/appointments/${id}`, data),
  initiatePayment: (id, paymentMethod = 'mock') => API.post(`/appointments/${id}/payment/initiate`, { paymentMethod }),
  confirmPayment: (id, paymentId) => API.post(`/appointments/${id}/payment/confirm`, { paymentId }),
  updateStatus: (id, status) => API.patch(`/appointments/${id}/status`, { status }),
  startVideoConsultation: (id) => API.post(`/appointments/${id}/video/start`),
  addPrescription: (id, prescriptionData) => API.post(`/appointments/${id}/prescription`, prescriptionData),
  sendPrescriptionToPharmacy: (id, payload = {}) => API.post(`/appointments/${id}/prescription/send-to-pharmacy`, payload),
  getPharmacyOrderStatus: (id) => API.get(`/appointments/${id}/pharmacy-order-status`),
  getNearbyPharmacists: (id) => API.get(`/appointments/${id}/nearby-pharmacists`),
  addDiagnosis: (id, diagnosisData) => API.patch(`/appointments/${id}/diagnosis`, diagnosisData),
  analyzeLabReport: (labReport) => API.post('/appointments/lab-report/analyze', { labReport }),
  updateConsultation: (id, consultationData) => API.patch(`/appointments/${id}/consultation`, consultationData),
  getStats: () => API.get('/appointments/stats/overview'),
};

// Health Prediction API
export const healthPredictionAPI = {
  createPrediction: (symptomData) => API.post('/health-prediction/predict', symptomData),
  explainReport: (reportText) => API.post('/health-prediction/explain-report', { reportText }),
  getMyPredictions: async () => {
    try {
      return await API.get('/health-prediction/my-predictions');
    } catch (error) {
      if (isMockDataEnabled && isNetworkError(error)) {
        return { data: mockData.healthPredictions };
      }
      if (isNetworkError(error)) {
        throwBackendUnavailable('Health prediction service is unreachable. Start backend and try again.');
      }
      throw error;
    }
  },
  getById: (id) => API.get(`/health-prediction/${id}`),
  getDoctorPatientsPredictions: (params) => API.get('/health-prediction/doctor/patients', { params }),
  reviewPrediction: (id, reviewData) => API.patch(`/health-prediction/${id}/review`, reviewData),
  getHighRisk: () => API.get('/health-prediction/high-risk'),
  getStats: () => API.get('/health-prediction/stats/overview'),
  getSymptomTrends: () => API.get('/health-prediction/symptom-trends'),
};

// Remote Monitoring API
export const monitoringAPI = {
  addReading: (readingData) => API.post('/monitoring/readings', readingData),
  getTrends: (days = 7, patientId) => API.get('/monitoring/trends', {
    params: {
      days,
      ...(patientId ? { patientId } : {})
    }
  }),
  getAlerts: () => API.get('/monitoring/alerts')
};

export const priorityAPI = {
  getDoctorQueue: (doctorId, date) => API.get(`/priority/doctor/${doctorId}/queue`, {
    params: date ? { date } : undefined
  })
};

// Pharmacy API
export const pharmacyAPI = {
  getQueue: async (status) => {
    try {
      return await API.get('/pharmacy/queue', { params: { status } });
    } catch (error) {
      if (isMockDataEnabled && isNetworkError(error)) {
        return { data: mockData.pharmacyOrders };
      }
      if (isNetworkError(error)) {
        throwBackendUnavailable('Pharmacy service is unreachable. Start backend and try again.');
      }
      throw error;
    }
  },
  getOrder: (id) => API.get(`/pharmacy/orders/${id}`),
  updateOrderStatus: (id, status, reason) => API.patch(`/pharmacy/orders/${id}/status`, { status, reason }),
  getMyOrders: async () => {
    try {
      return await API.get('/pharmacy/my-orders');
    } catch (error) {
      if (isMockDataEnabled && isNetworkError(error)) {
        return { data: mockData.pharmacyOrders };
      }
      if (isNetworkError(error)) {
        throwBackendUnavailable('Pharmacy service is unreachable. Start backend and try again.');
      }
      throw error;
    }
  },
  getStats: () => API.get('/pharmacy/stats'),
};

export const pharmacistAPI = {
  getDashboard: () => API.get('/pharmacist/dashboard'),
  getQueue: (params) => API.get('/pharmacist/queue', { params }),
  getInventory: (params) => API.get('/pharmacist/inventory', { params }),
  updateInventoryStock: (id, payload) => API.patch(`/pharmacist/inventory/${id}/stock`, payload),
  assignOrder: (id) => API.patch(`/pharmacist/orders/${id}/assign`),
  startPreparation: (id) => API.patch(`/pharmacist/orders/${id}/start-preparation`),
  completePreparation: (id, payload = {}) => API.patch(`/pharmacist/orders/${id}/complete-preparation`, payload),
  dispatchOrder: (id, payload) => API.patch(`/pharmacist/orders/${id}/dispatch`, payload)
};

// NLP API
export const nlpAPI = {
  processQuery: async (query) => {
    try {
      return await API.post('/nlp-query', { query });
    } catch (error) {
      if (isNetworkError(error)) {
        throwBackendUnavailable('NLP service is unreachable. Start backend and try again.');
      }
      throw error;
    }
  },
  getSuggestions: () => API.get('/nlp-query/suggestions'),
  getHistory: (limit = 20) => API.get('/nlp-query/history', { params: { limit } }),
  getStats: () => API.get('/nlp-query/stats')
};

// Doctors API
export const doctorsAPI = {
  getAll: (params) => API.get('/doctors', { params }),
  getBookingOptions: (params) => API.get('/doctors/booking/options', { params }),
  getById: (id) => API.get(`/doctors/${id}`),
  getProfile: () => API.get('/doctors/profile/me'),
  createProfile: (profileData) => API.post('/doctors', profileData),
  updateProfile: (id, data) => API.put(`/doctors/${id}`, data),
  getAvailability: (id, date) => API.get(`/doctors/${id}/timeslots`, {
    params: date ? { date } : undefined
  }),
  updateAvailability: (id, availability) => API.put(`/doctors/${id}/availability`, availability),
};

export const emergencyTicketsAPI = {
  create: (payload) => API.post('/emergency-tickets', payload),
  getDoctorFeed: () => API.get('/emergency-tickets/doctor-feed'),
  updateStatus: (id, status) => API.patch(`/emergency-tickets/${id}/status`, { status })
};

// Users API
export const usersAPI = {
  getAll: (params) => API.get('/users', { params }),
  getById: (id) => API.get(`/users/${id}`),
  update: (id, data) => API.put(`/users/${id}`, data),
  getStats: () => API.get('/users/stats/overview'),
};

export default API;
