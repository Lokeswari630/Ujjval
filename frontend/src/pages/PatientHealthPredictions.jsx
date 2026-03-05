import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import Button from '../components/ui/Button';
import { healthPredictionAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const getRiskBadgeClass = (riskLevel) => {
  if (riskLevel === 'low') return 'bg-green-100 text-green-800';
  if (riskLevel === 'medium') return 'bg-yellow-100 text-yellow-800';
  if (riskLevel === 'high') return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
};

const PatientHealthPredictions = () => {
  const { user } = useAuth();
  const [reportText, setReportText] = useState('');
  const [reportInsight, setReportInsight] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [predicting, setPredicting] = useState(false);
  const [showReportUpload, setShowReportUpload] = useState(false);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [predictionForm, setPredictionForm] = useState({
    symptoms: '',
    age: user?.age ? String(user.age) : '',
    gender: user?.gender || 'other',
    reportFileData: '',
    reportFileName: '',
    reportFileType: ''
  });

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

  const onReportFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setPredictionForm((prev) => ({
        ...prev,
        reportFileData: '',
        reportFileName: '',
        reportFileType: ''
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPredictionForm((prev) => ({
        ...prev,
        reportFileData: typeof reader.result === 'string' ? reader.result : '',
        reportFileName: file.name,
        reportFileType: file.type || ''
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePrediction = async (event) => {
    event.preventDefault();

    const symptoms = predictionForm.symptoms
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const hasReportFile = Boolean(predictionForm.reportFileData);

    if (symptoms.length === 0 && !hasReportFile) {
      setErrorMessage('Please enter symptoms or upload a health report file.');
      return;
    }

    if (!predictionForm.age || Number(predictionForm.age) <= 0) {
      setErrorMessage('Please enter a valid age.');
      return;
    }

    try {
      setPredicting(true);
      setErrorMessage('');

      const createResponse = await healthPredictionAPI.createPrediction({
        symptoms,
        age: Number(predictionForm.age),
        gender: predictionForm.gender,
        reportUpload: predictionForm.reportFileData
          ? {
            fileName: predictionForm.reportFileName,
            fileType: predictionForm.reportFileType,
            fileData: predictionForm.reportFileData
          }
          : undefined
      });
      setLatestPrediction(createResponse?.data || null);

      setPredictionForm((prev) => ({
        ...prev,
        symptoms: '',
        reportFileData: '',
        reportFileName: '',
        reportFileType: ''
      }));
      setShowReportUpload(true);
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to create health prediction.');
    } finally {
      setPredicting(false);
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
        <>
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Create Health Prediction</h3>
              <form onSubmit={handleCreatePrediction} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Symptoms (comma separated)</label>
                  <input
                    type="text"
                    value={predictionForm.symptoms}
                    onChange={(event) => setPredictionForm((prev) => ({ ...prev, symptoms: event.target.value }))}
                    placeholder="fever, cough, headache (optional if report uploaded)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                    <input
                      type="number"
                      min="1"
                      value={predictionForm.age}
                      onChange={(event) => setPredictionForm((prev) => ({ ...prev, age: event.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      value={predictionForm.gender}
                      onChange={(event) => setPredictionForm((prev) => ({ ...prev, gender: event.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowReportUpload((prev) => !prev)}>
                    {showReportUpload ? 'Hide Report Upload' : 'Upload Health Report (Optional)'}
                  </Button>
                </div>

                {(showReportUpload || latestPrediction) && (
                  <div className="rounded-lg border border-gray-200 p-3 space-y-3">
                    {showReportUpload && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Upload Report File</label>
                        <input
                          type="file"
                          accept="image/*,.pdf,.txt,.csv,.json"
                          onChange={onReportFileChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        {predictionForm.reportFileName && (
                          <p className="mt-1 text-xs text-gray-600">Selected: {predictionForm.reportFileName}</p>
                        )}
                      </div>
                    )}

                    {latestPrediction && (
                      <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-green-900">Prediction Response</p>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskBadgeClass(String(latestPrediction?.aiAnalysis?.riskLevel || 'unknown').toLowerCase())}`}>
                            {String(latestPrediction?.aiAnalysis?.riskLevel || 'unknown').toLowerCase()}
                          </span>
                        </div>

                        {Array.isArray(latestPrediction?.aiAnalysis?.possibleConditions) && latestPrediction.aiAnalysis.possibleConditions.length > 0 && (
                          <p className="text-sm text-gray-700 mt-2">
                            Conditions: {latestPrediction.aiAnalysis.possibleConditions
                              .map((condition) => {
                                if (typeof condition === 'string') return condition;
                                if (condition?.condition) return condition.condition;
                                if (condition?.name) return condition.name;
                                return '';
                              })
                              .filter(Boolean)
                              .join(', ') || 'Not enough condition details'}
                          </p>
                        )}

                        {Array.isArray(latestPrediction?.aiAnalysis?.recommendations) && latestPrediction.aiAnalysis.recommendations.length > 0 && (
                          <div className="text-sm text-gray-700 mt-2">
                            <p className="font-medium">Home Care Guidance & Food:</p>
                            <ul className="list-disc ml-5 mt-1 space-y-1">
                              {latestPrediction.aiAnalysis.recommendations.slice(0, 6).map((item, recIndex) => (
                                <li key={`${latestPrediction?._id || 'latest'}-rec-${recIndex}`}>{item?.type}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" loading={predicting}>Generate Prediction</Button>
                </div>
              </form>
            </div>

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
                  <p className="text-sm text-gray-800 whitespace-pre-line">{reportInsight.summary}</p>
                  <p className="text-xs text-gray-600 mt-2">Risk: {reportInsight.overallRisk}</p>
                </div>
              )}
            </div>

        </>
      </main>
    </div>
  );
};

export default PatientHealthPredictions;
