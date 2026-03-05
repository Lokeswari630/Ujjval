import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Pill, Activity, TrendingUp, Clock, AlertCircle, FileText, UserCircle2 } from 'lucide-react';
import Button from '../components/ui/Button';
import HealthChart from '../components/charts/HealthChart';
import { appointmentsAPI, healthPredictionAPI, pharmacyAPI, monitoringAPI } from '../services/api';

const PatientDashboard = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState({
    appointments: [],
    predictions: [],
    medicines: []
  });
  const [loading, setLoading] = useState(true);
  const [reportText, setReportText] = useState('');
  const [reportInsight, setReportInsight] = useState(null);
  const [monitoring, setMonitoring] = useState({ chart: [], alerts: [] });
  const [vitalsInput, setVitalsInput] = useState({ systolic: '', diastolic: '', heartRate: '', bloodSugar: '' });
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [prescriptionRecords, setPrescriptionRecords] = useState([]);
  const [prescriptionFilters, setPrescriptionFilters] = useState({
    fromDate: '',
    toDate: '',
    doctorId: '',
    recordType: 'all'
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadMonitoring();
  }, []);

  useEffect(() => {
    loadPrescriptionRecords();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');

    if (tab === 'overview' || tab === 'analytics' || tab === 'prescriptions') {
      setActiveTab(tab);
    }
  }, [location.search]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [appointments, predictions, medicines] = await Promise.all([
        appointmentsAPI.getAll({ limit: 100 }),
        healthPredictionAPI.getMyPredictions(),
        pharmacyAPI.getMyOrders()
      ]);

      setData({
        appointments: appointments.data || [],
        predictions: predictions.data || [],
        medicines: medicines.data || []
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonitoring = async () => {
    try {
      const [trends, alerts] = await Promise.all([
        monitoringAPI.getTrends(7),
        monitoringAPI.getAlerts()
      ]);

      const chart = (trends?.data?.chart || []).map((item, index) => ({
        name: item.name || `Day ${index + 1}`,
        value: item.bloodSugar || item.heartRate || 0
      }));

      setMonitoring({
        chart,
        alerts: alerts?.data || []
      });
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    }
  };

  const loadPrescriptionRecords = async (filters = prescriptionFilters) => {
    try {
      setPrescriptionLoading(true);
      const response = await appointmentsAPI.getAll({
        status: 'completed',
        limit: 100,
        ...(filters.fromDate ? { dateFrom: filters.fromDate } : {}),
        ...(filters.toDate ? { dateTo: filters.toDate } : {})
      });
      setPrescriptionRecords(response?.data || []);
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      setPrescriptionRecords([]);
    } finally {
      setPrescriptionLoading(false);
    }
  };

  const handleReportExplain = async () => {
    if (!reportText.trim()) return;
    try {
      const response = await healthPredictionAPI.explainReport(reportText);
      setReportInsight(response.data);
    } catch (error) {
      console.error('Report explanation failed:', error);
    }
  };

  const handleVitalsSubmit = async (e) => {
    e.preventDefault();

    try {
      await monitoringAPI.addReading({
        bloodPressure: {
          systolic: Number(vitalsInput.systolic),
          diastolic: Number(vitalsInput.diastolic)
        },
        heartRate: Number(vitalsInput.heartRate),
        bloodSugar: Number(vitalsInput.bloodSugar)
      });

      setVitalsInput({ systolic: '', diastolic: '', heartRate: '', bloodSugar: '' });
      await loadMonitoring();
    } catch (error) {
      console.error('Failed to save vitals:', error);
    }
  };

  const healthTrendsData = monitoring.chart.length
    ? monitoring.chart
    : [{ name: 'No data', value: 0 }];

  const riskCounts = data.predictions.reduce((acc, prediction) => {
    const level = prediction?.aiAnalysis?.riskLevel;
    if (!level) return acc;
    const normalized = String(level).toLowerCase();
    acc[normalized] = (acc[normalized] || 0) + 1;
    return acc;
  }, {});

  const riskDistribution = [
    { name: 'Low Risk', value: riskCounts.low || 0 },
    { name: 'Medium Risk', value: riskCounts.medium || 0 },
    { name: 'High Risk', value: riskCounts.high || 0 },
    { name: 'Urgent', value: riskCounts.urgent || 0 }
  ];

  const latestRiskLevel = data.predictions[0]?.aiAnalysis?.riskLevel;
  const pendingAcceptanceCount = data.appointments.filter((appointment) => appointment.status === 'payment_submitted').length;
  const healthScore = latestRiskLevel === 'low'
    ? 90
    : latestRiskLevel === 'medium'
      ? 75
      : latestRiskLevel === 'high'
        ? 55
        : latestRiskLevel === 'urgent'
          ? 35
          : 80;

  const doctorOptions = Array.from(
    new Map(
      prescriptionRecords
        .filter((appointment) => appointment?.doctorId?._id)
        .map((appointment) => [
          appointment.doctorId._id,
          appointment?.doctorId?.userId?.name || 'Doctor'
        ])
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  const filteredPrescriptionRecords = prescriptionRecords.filter((appointment) => {
    if (prescriptionFilters.doctorId && appointment?.doctorId?._id !== prescriptionFilters.doctorId) {
      return false;
    }

    if (prescriptionFilters.recordType === 'prescription') {
      return Array.isArray(appointment?.prescription?.medicines) && appointment.prescription.medicines.length > 0;
    }

    if (prescriptionFilters.recordType === 'diagnosis') {
      return Boolean(String(appointment?.diagnosis || '').trim());
    }

    if (prescriptionFilters.recordType === 'reports') {
      return Boolean(String(appointment?.notes || '').trim() || String(appointment?.description || '').trim());
    }

    return true;
  });

  const applyPrescriptionFilters = async (event) => {
    event.preventDefault();
    await loadPrescriptionRecords(prescriptionFilters);
  };

  const resetPrescriptionFilters = async () => {
    const cleared = {
      fromDate: '',
      toDate: '',
      doctorId: '',
      recordType: 'all'
    };
    setPrescriptionFilters(cleared);
    await loadPrescriptionRecords(cleared);
  };

  const downloadPrescriptionPdf = () => {
    if (filteredPrescriptionRecords.length === 0) {
      return;
    }

    const escapeHtml = (value) => String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const filterSummary = [
      prescriptionFilters.fromDate ? `From: ${prescriptionFilters.fromDate}` : 'From: Any',
      prescriptionFilters.toDate ? `To: ${prescriptionFilters.toDate}` : 'To: Any',
      prescriptionFilters.doctorId
        ? `Doctor: ${doctorOptions.find((doctor) => doctor.id === prescriptionFilters.doctorId)?.name || 'Selected'}`
        : 'Doctor: All',
      `Type: ${prescriptionFilters.recordType}`
    ].join(' | ');

    const rowsHtml = filteredPrescriptionRecords.map((appointment, index) => {
      const medicines = Array.isArray(appointment?.prescription?.medicines)
        ? appointment.prescription.medicines.map((medicine) => `${medicine.name} (${medicine.dosage}, ${medicine.frequency}, ${medicine.duration})`).join(', ')
        : '';

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(appointment?.doctorId?.userId?.name || 'Doctor')}</td>
          <td>${escapeHtml(appointment?.date ? new Date(appointment.date).toLocaleDateString() : '-')}</td>
          <td>${escapeHtml(appointment?.diagnosis || '-')}</td>
          <td>${escapeHtml(medicines || '-')}</td>
          <td>${escapeHtml(appointment?.notes || appointment?.description || '-')}</td>
        </tr>
      `;
    }).join('');

    const printableHtml = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Prescription Records</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { margin: 0 0 8px; font-size: 22px; }
          p { margin: 0 0 16px; color: #4b5563; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; vertical-align: top; }
          th { background: #f3f4f6; text-align: left; }
          .meta { margin-bottom: 12px; color: #374151; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Prescription & Reports Summary</h1>
        <div class="meta">Generated on: ${new Date().toLocaleString()}</div>
        <p>${escapeHtml(filterSummary)}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Doctor</th>
              <th>Date</th>
              <th>Diagnosis</th>
              <th>Prescription</th>
              <th>Reports/Notes</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1024,height=768');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(printableHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const quickActions = [
    {
      title: 'Book Appointment',
      description: 'Schedule with a doctor',
      icon: <Calendar className="w-6 h-6" />,
      link: '/appointments/book',
      color: 'bg-blue-500'
    },
    {
      title: 'Emergency Services',
      description: 'Request urgent help from hospital',
      icon: <AlertCircle className="w-6 h-6" />,
      link: '/emergency/incidents',
      color: 'bg-red-500'
    },
    {
      title: 'Health Prediction',
      description: 'AI health risk analysis',
      icon: <Activity className="w-6 h-6" />,
      link: '/patient/health-predictions',
      color: 'bg-green-500'
    },
    {
      title: 'Medicine Status',
      description: 'Track your prescriptions',
      icon: <Pill className="w-6 h-6" />,
      link: '/pharmacy',
      color: 'bg-purple-500'
    },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{data.appointments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-white">
              <Activity className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Health Reports</p>
              <p className="text-2xl font-bold text-gray-900">{data.predictions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-white">
              <Pill className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Prescriptions</p>
              <p className="text-2xl font-bold text-gray-900">{data.medicines.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center text-white">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Health Score</p>
              <p className="text-2xl font-bold text-gray-900">{healthScore}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center text-white">
              <Clock className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Pending Acceptance</p>
              <p className="text-2xl font-bold text-gray-900">{pendingAcceptanceCount}</p>
            </div>
          </div>
        </div>
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

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Appointments</h3>
          <div className="space-y-3">
            {data.appointments.length > 0 ? (
              data.appointments.slice(0, 3).map((appointment) => (
                <div key={appointment._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{appointment.doctorId?.userId?.name || 'Doctor'}</p>
                    <p className="text-sm text-gray-600">{new Date(appointment.date).toLocaleDateString()}</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {appointment.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No upcoming appointments</p>
            )}
          </div>
        </div>

        {/* Recent Health Predictions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Health Predictions</h3>
          <div className="space-y-3">
            {data.predictions.length > 0 ? (
              data.predictions.slice(0, 3).map((prediction) => (
                <div key={prediction._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Health Risk Analysis</p>
                    <p className="text-sm text-gray-600">{new Date(prediction.predictionDate).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    prediction.aiAnalysis.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                    prediction.aiAnalysis.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    prediction.aiAnalysis.riskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {prediction.aiAnalysis.riskLevel}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No health predictions yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthChart
          type="line"
          data={healthTrendsData}
          title="Health Score Trend (7 Days)"
        />
        <HealthChart
          type="pie"
          data={riskDistribution}
          title="Risk Distribution"
        />
      </div>
    </div>
  );

  const renderPrescriptions = () => (
    <div className="space-y-6">
      <form onSubmit={applyPrescriptionFilters} className="bg-white rounded-lg shadow p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
          <input
            type="date"
            value={prescriptionFilters.fromDate}
            onChange={(event) => setPrescriptionFilters((prev) => ({ ...prev, fromDate: event.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
          <input
            type="date"
            value={prescriptionFilters.toDate}
            onChange={(event) => setPrescriptionFilters((prev) => ({ ...prev, toDate: event.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Doctor</label>
          <select
            value={prescriptionFilters.doctorId}
            onChange={(event) => setPrescriptionFilters((prev) => ({ ...prev, doctorId: event.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Doctors</option>
            {doctorOptions.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Record Type</label>
          <select
            value={prescriptionFilters.recordType}
            onChange={(event) => setPrescriptionFilters((prev) => ({ ...prev, recordType: event.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All</option>
            <option value="prescription">Prescription</option>
            <option value="diagnosis">Diagnosis</option>
            <option value="reports">Reports / Notes</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" className="w-full" loading={prescriptionLoading}>Apply</Button>
          <Button type="button" variant="outline" onClick={resetPrescriptionFilters}>Reset</Button>
        </div>
      </form>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Completed Appointment Records</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{filteredPrescriptionRecords.length} records</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={downloadPrescriptionPdf}
              disabled={filteredPrescriptionRecords.length === 0}
            >
              Download PDF
            </Button>
          </div>
        </div>

        {prescriptionLoading ? (
          <div className="p-6 text-center text-gray-500">Loading records...</div>
        ) : filteredPrescriptionRecords.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No records found for the selected filters.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPrescriptionRecords.map((appointment) => (
              <div key={appointment._id} className="p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-gray-900">{appointment?.doctorId?.userId?.name || 'Doctor'}</p>
                  <span className="text-sm text-gray-600">
                    {appointment?.date ? new Date(appointment.date).toLocaleDateString() : '-'} • {appointment?.startTime || '--:--'}
                  </span>
                </div>

                {appointment?.diagnosis && (
                  <p className="text-sm text-gray-700"><span className="font-medium">Diagnosis:</span> {appointment.diagnosis}</p>
                )}

                {Array.isArray(appointment?.prescription?.medicines) && appointment.prescription.medicines.length > 0 && (
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">Prescription Medicines:</p>
                    <ul className="list-disc ml-5 mt-1 space-y-1">
                      {appointment.prescription.medicines.map((medicine, index) => (
                        <li key={`${appointment._id}-medicine-${index}`}>
                          {medicine.name} • {medicine.dosage} • {medicine.frequency} • {medicine.duration}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(appointment?.notes || appointment?.description) && (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Reports / Notes:</span> {appointment.notes || appointment.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderAITools = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">AI Medical Report Explanation</h3>
        <textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          placeholder="Paste report text (e.g., Hemoglobin: 10.2, Blood Sugar: 190)"
          className="w-full min-h-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button onClick={handleReportExplain}>Explain Report</Button>

        {reportInsight && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-800">{reportInsight.summary}</p>
            <p className="text-xs text-gray-600 mt-2">Risk: {reportInsight.overallRisk}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Remote Patient Monitoring</h3>
        <form onSubmit={handleVitalsSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input type="number" placeholder="Systolic" value={vitalsInput.systolic} onChange={(e) => setVitalsInput((prev) => ({ ...prev, systolic: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg" required />
          <input type="number" placeholder="Diastolic" value={vitalsInput.diastolic} onChange={(e) => setVitalsInput((prev) => ({ ...prev, diastolic: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg" required />
          <input type="number" placeholder="Heart Rate" value={vitalsInput.heartRate} onChange={(e) => setVitalsInput((prev) => ({ ...prev, heartRate: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg" required />
          <input type="number" placeholder="Blood Sugar" value={vitalsInput.bloodSugar} onChange={(e) => setVitalsInput((prev) => ({ ...prev, bloodSugar: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg" required />
          <Button type="submit" className="md:col-span-4">Save Reading</Button>
        </form>

        <HealthChart type="line" data={monitoring.chart.length ? monitoring.chart : [{ name: 'No data', value: 0 }]} title="Vitals Trend (7 Days)" />

        {monitoring.alerts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-700 mb-2">Recent Alerts</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {monitoring.alerts.slice(0, 3).map((item) => (
                <li key={item.readingId}>{new Date(item.recordedAt).toLocaleString()} - {item.alerts[0]?.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'prescriptions', label: 'Prescriptions', icon: <FileText className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Patient Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
              <Link
                to="/patient/profile"
                className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                aria-label="Patient profile"
                title="Patient profile"
              >
                <UserCircle2 className="w-4 h-4" />
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
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'prescriptions' && renderPrescriptions()}
          </>
        )}
      </main>
    </div>
  );
};

export default PatientDashboard;
