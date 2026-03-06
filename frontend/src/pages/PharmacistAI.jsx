import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import NLPChat from '../components/chat/NLPChat';

const PharmacistAI = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-50/60 via-white to-slate-100/60">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b border-sky-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/pharmacist" className="text-slate-400 hover:text-sky-700 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-600" />
                <h1 className="text-xl font-semibold text-slate-900">Pharmacy AI Assistant</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">Pharmacist {user?.name}</span>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-sky-100 shadow-sm p-4 sm:p-6">
          <NLPChat />
        </div>
      </main>
    </div>
  );
};

export default PharmacistAI;