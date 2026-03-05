import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button';
import { healthPredictionAPI } from '../services/api';

const DoctorHealthPredictions = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPredictions = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await healthPredictionAPI.getDoctorPatientsPredictions({ limit: 50 });
        setPredictions(response?.data || []);
      } catch (loadError) {
        setError(loadError?.message || 'Failed to load health predictions');
      } finally {
        setLoading(false);
      }
    };

    loadPredictions();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Health Predictions</h1>
            <p className="text-sm text-gray-600">Predictions for patients in your care</p>
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
          <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-600">Loading predictions...</div>
        ) : predictions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-600">No predictions found for your patients yet.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-2">Patient</th>
                    <th className="text-left px-4 py-2">Risk</th>
                    <th className="text-left px-4 py-2">Score</th>
                    <th className="text-left px-4 py-2">Urgency</th>
                    <th className="text-left px-4 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((item) => {
                    const riskLevel = item?.aiAnalysis?.riskLevel || 'unknown';
                    const riskClass = riskLevel === 'high' || riskLevel === 'urgent'
                      ? 'text-red-700 bg-red-50'
                      : 'text-amber-700 bg-amber-50';

                    return (
                      <tr key={item._id} className="border-t border-gray-100">
                        <td className="px-4 py-2 font-medium text-gray-900">{item?.patientId?.name || 'Patient'}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${riskClass}`}>
                            <AlertTriangle className="w-3 h-3" />
                            {riskLevel}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-700">{item?.aiAnalysis?.riskScore ?? '-'}</td>
                        <td className="px-4 py-2 text-gray-700">{item?.aiAnalysis?.urgencyLevel || '-'}</td>
                        <td className="px-4 py-2 text-gray-700">
                          {item?.predictionDate ? new Date(item.predictionDate).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DoctorHealthPredictions;
