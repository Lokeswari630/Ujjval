import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import Button from '../components/ui/Button';
import { healthPredictionAPI } from '../services/api';

const getRiskBadgeClass = (riskLevel) => {
  if (riskLevel === 'low') return 'bg-green-100 text-green-800';
  if (riskLevel === 'medium') return 'bg-yellow-100 text-yellow-800';
  if (riskLevel === 'high') return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
};

const PatientHealthPredictions = () => {
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState([]);
  const [reportText, setReportText] = useState('');
  const [reportInsight, setReportInsight] = useState(null);

  useEffect(() => {
    const loadPredictions = async () => {
      try {
        setLoading(true);
        const response = await healthPredictionAPI.getMyPredictions();
        setPredictions(response?.data || []);
      } catch (error) {
        console.error('Failed to load health predictions:', error);
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    };

    loadPredictions();
  }, []);

  const riskCounts = useMemo(() => (
    predictions.reduce((acc, prediction) => {
      const level = String(prediction?.aiAnalysis?.riskLevel || '').toLowerCase();
      if (!level) return acc;
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {})
  ), [predictions]);

  const handleReportExplain = async () => {
    if (!reportText.trim()) return;

    try {
      const response = await healthPredictionAPI.explainReport(reportText);
      setReportInsight(response?.data || null);
    } catch (error) {
      console.error('Failed to explain report:', error);
      setReportInsight(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">Health Predictions</h1>
          </div>
          <Link to="/patient">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-600">Loading health predictions...</div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">AI Medical Report Explanation</h3>
              <textarea
                value={reportText}
                onChange={(event) => setReportText(event.target.value)}
                placeholder="Paste report text for AI explanation"
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

            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Prediction History</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Total predictions: {predictions.length} • Low: {riskCounts.low || 0} • Medium: {riskCounts.medium || 0} • High: {riskCounts.high || 0} • Urgent: {riskCounts.urgent || 0}
                </p>
              </div>
              {predictions.length === 0 ? (
                <div className="p-6 text-sm text-gray-600">No health predictions available.</div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {predictions.map((prediction) => {
                    const riskLevel = String(prediction?.aiAnalysis?.riskLevel || 'unknown').toLowerCase();

                    return (
                      <div key={prediction._id} className="p-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-gray-900">Health Risk Analysis</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {prediction?.predictionDate ? new Date(prediction.predictionDate).toLocaleString() : 'Date unavailable'}
                          </p>
                          {Array.isArray(prediction?.aiAnalysis?.possibleConditions) && prediction.aiAnalysis.possibleConditions.length > 0 && (
                            <p className="text-sm text-gray-700 mt-2">
                              Conditions: {prediction.aiAnalysis.possibleConditions.map((condition) => condition.name || condition).join(', ')}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskBadgeClass(riskLevel)}`}>
                          {riskLevel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default PatientHealthPredictions;
