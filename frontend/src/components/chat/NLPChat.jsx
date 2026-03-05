import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Mic, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { nlpAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const DEFAULT_SUGGESTIONS = [
  'Go to dashboard page',
  'Open my profile page',
  'Open appointments page',
  'Open patient records page',
  'Open health predictions page'
];

let cachedSuggestions = null;
let cachedHistory = null;

const NAVIGATION_KEYWORDS = [
  { terms: ['dashboard', 'home'], route: '/dashboard', label: 'dashboard' },
  { terms: ['profile', 'my profile'], route: '__ROLE_PROFILE__', label: 'profile' },
  { terms: ['appointment', 'appointments', 'booking'], route: '/appointments', label: 'appointments' },
  { terms: ['queue', 'priority queue', 'patient queue'], route: '/doctor-queue', label: 'priority queue' },
  { terms: ['video consultation', 'start consultation', 'video call'], route: '/doctor-queue', label: 'video consultation' },
  { terms: ['timeline', 'health timeline', 'patient timeline'], route: '/patient-insights', label: 'patient timeline' },
  { terms: ['doctor list', 'find doctors', 'doctors'], route: '/doctors', label: 'doctors' },
  { terms: ['patients', 'patient list', 'patient records', 'patient insights'], route: '/patient-insights', label: 'patient insights' },
  { terms: ['pharmacy', 'medicine orders'], route: '/pharmacy', label: 'pharmacy' },
  { terms: ['inventory', 'stock'], route: '/inventory', label: 'inventory' },
  { terms: ['orders'], route: '/orders', label: 'orders' },
  { terms: ['prediction', 'predictions', 'health prediction'], route: '/health-prediction', label: 'health prediction' }
];

const NAVIGATION_HINTS = ['go to', 'open', 'navigate', 'take me', 'show page', 'page', 'screen'];

const NLPChat = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Load suggestions
    const loadSuggestions = async () => {
      if (Array.isArray(cachedSuggestions) && cachedSuggestions.length > 0) {
        setSuggestions(cachedSuggestions);
        return;
      }

      try {
        const data = await nlpAPI.getSuggestions();
        const nextSuggestions = data.data?.slice(0, 5) || DEFAULT_SUGGESTIONS;
        cachedSuggestions = nextSuggestions;
        setSuggestions(nextSuggestions);
      } catch (error) {
        const message = typeof error === 'string' ? error : error?.message;
        if (typeof message === 'string' && message.toLowerCase().includes('too many requests')) {
          setSuggestions(cachedSuggestions || DEFAULT_SUGGESTIONS);
          return;
        }
        console.error('Error loading suggestions:', error);
        setSuggestions(DEFAULT_SUGGESTIONS);
      }
    };

    const loadHistory = async () => {
      if (Array.isArray(cachedHistory)) {
        setHistory(cachedHistory);
        return;
      }

      try {
        const historyResponse = await nlpAPI.getHistory(8);
        const nextHistory = historyResponse?.data || [];
        cachedHistory = nextHistory;
        setHistory(nextHistory);
      } catch (error) {
        const message = typeof error === 'string' ? error : error?.message;
        if (typeof message === 'string' && message.toLowerCase().includes('too many requests')) {
          setHistory(cachedHistory || []);
          return;
        }
        console.error('Error loading NLP history:', error);
        setHistory([]);
      }
    };

    loadSuggestions();
    loadHistory();
    
    // Add welcome message
    setMessages([
      {
        id: 1,
        type: 'bot',
        text: "Hello! I'm your AI health assistant. I can help you with booking appointments, checking medicine status, finding doctors, and more. How can I help you today?",
        timestamp: new Date()
      }
    ]);

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        setInput(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const resolveNavigationCommand = (queryText) => {
    const normalized = String(queryText || '').trim().toLowerCase();
    if (!normalized) return null;

    const hasNavigationHint = NAVIGATION_HINTS.some((hint) => normalized.includes(hint));
    if (!hasNavigationHint) return null;

    const match = NAVIGATION_KEYWORDS.find(({ terms }) => terms.some((term) => normalized.includes(term)));
    if (!match) return null;

    const getRoleProfileRoute = () => {
      if (user?.role === 'doctor') return '/doctor-profile';
      if (user?.role === 'patient') return '/patient-profile';
      if (user?.role === 'admin') return '/admin-profile';
      return '/profile';
    };

    const resolvedMatch = match.route === '__ROLE_PROFILE__'
      ? { ...match, route: getRoleProfileRoute() }
      : match;

    if (resolvedMatch.route === '/patients' && !['doctor', 'admin'].includes(user?.role)) {
      return null;
    }

    if (['/doctor-queue', '/doctor-timeline', '/patient-insights', '/health-predictions'].includes(resolvedMatch.route) && user?.role !== 'doctor') {
      return null;
    }

    if (resolvedMatch.route === '/inventory' && !['pharmacist', 'admin'].includes(user?.role)) {
      return null;
    }

    if (resolvedMatch.route === '/orders' && user?.role !== 'pharmacist') {
      return null;
    }

    return resolvedMatch;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const queryText = input.trim();

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: queryText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    const navigationCommand = resolveNavigationCommand(queryText);
    if (navigationCommand) {
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: `Navigating to ${navigationCommand.label}...`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      navigate(navigationCommand.route);
      return;
    }

    setIsLoading(true);

    try {
      const response = await nlpAPI.processQuery(queryText);
      const payload = response?.data || {};
      const resultCount = Array.isArray(payload.result) ? payload.result.length : 0;
      const summaryText = `${response?.message || 'Query processed'}${resultCount >= 0 ? ` (${resultCount} result${resultCount === 1 ? '' : 's'})` : ''}`;
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: summaryText,
        data: payload,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);

      if (voiceEnabled && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(botMessage.text);
        utterance.rate = 1;
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: "Sorry, I couldn't process that query right now.",
        error: error.message,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
  };

  const handleSpeechToText = () => {
    if (!recognitionRef.current || isListening) return;
    setIsListening(true);
    recognitionRef.current.start();
  };

  const renderResultRows = (message) => {
    const rows = message?.data?.result;
    const type = message?.data?.resultType;

    if (!Array.isArray(rows) || rows.length === 0) {
      return (
        <p className="text-xs mt-2 text-gray-500">
          No records returned. Try one of the suggestions below.
        </p>
      );
    }

    if (type === 'prediction') {
      const latest = rows[0];
      return (
        <div className="mt-2 text-xs bg-white/70 rounded p-2 space-y-1">
          <p><span className="font-medium">Risk:</span> {latest?.aiAnalysis?.riskLevel || 'N/A'}</p>
          <p><span className="font-medium">Score:</span> {latest?.aiAnalysis?.riskScore ?? 'N/A'}</p>
          <p><span className="font-medium">Date:</span> {latest?.predictionDate ? new Date(latest.predictionDate).toLocaleString() : 'N/A'}</p>
          {Array.isArray(latest?.symptoms) && latest.symptoms.length > 0 && (
            <p><span className="font-medium">Symptoms:</span> {latest.symptoms.join(', ')}</p>
          )}
          {Array.isArray(latest?.aiAnalysis?.recommendations) && latest.aiAnalysis.recommendations.length > 0 && (
            <div>
              <p className="font-medium">Guidance:</p>
              <ul className="list-disc ml-4 mt-1 space-y-1">
                {latest.aiAnalysis.recommendations.slice(0, 4).map((item, index) => (
                  <li key={`rec-${index}`}>
                    {item?.type || 'Recommendation'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full text-xs bg-white/70 rounded overflow-hidden">
          <thead>
            <tr className="bg-gray-200/70 text-gray-700">
              <th className="px-2 py-1 text-left">Primary</th>
              <th className="px-2 py-1 text-left">Date</th>
              <th className="px-2 py-1 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((row, index) => (
              <tr key={row?._id || index} className="border-t border-gray-200/70">
                <td className="px-2 py-1 text-gray-700">
                  {row?.name || row?.patientId?.name || row?.doctorId?.userId?.name || row?.orderId || 'Record'}
                </td>
                <td className="px-2 py-1 text-gray-700">
                  {row?.date ? new Date(row.date).toLocaleDateString() : row?.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-'}
                </td>
                <td className="px-2 py-1 text-gray-700">
                  {row?.status || row?.aiAnalysis?.riskLevel || row?.category || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="bg-linear-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Bot className="w-6 h-6" />
          <h3 className="font-semibold">AI Health Assistant</h3>
        </div>
        <p className="text-sm text-blue-100 mt-1">
          Ask me about appointments, medicines, symptoms, or doctors
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-2 max-w-[80%] ${
              message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}>
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.type === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {message.type === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
              <div className={`rounded-lg px-3 py-2 ${
                message.type === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="text-sm">{message.text}</p>
                {message.data?.intent && (
                  <div className="mt-2 text-xs opacity-75">
                    <span className="font-medium">Intent:</span> {message.data.intent}
                    {message.data.confidence && (
                      <span className="ml-2">
                        ({Math.round(message.data.confidence * 100)}% confidence)
                      </span>
                    )}
                  </div>
                )}
                {message.type === 'bot' && renderResultRows(message)}
                <p className="text-xs mt-1 opacity-75">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2 max-w-[80%]">
              <div className="shrink-0 w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-gray-100 text-gray-900 rounded-lg px-3 py-2">
                <p className="text-sm">Thinking...</p>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Recent queries:</p>
          <div className="flex flex-wrap gap-2">
            {history.slice(0, 4).map((item) => (
              <button
                key={item._id}
                onClick={() => setInput(item.query)}
                className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-100 transition-colors"
              >
                {item.query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handleSpeechToText}
            className={`p-2 rounded-lg border ${isListening ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            disabled={isLoading}
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setVoiceEnabled((prev) => !prev)}
            className={`p-2 rounded-lg border ${voiceEnabled ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default NLPChat;
