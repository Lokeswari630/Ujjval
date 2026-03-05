import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck2, PillBottle, Mic, FileText, LogIn, Stethoscope, PackageCheck } from 'lucide-react';
import Button from '../components/Button';

const LandingPage = () => {
  const features = [
    { title: 'AI Appointment Booking', description: 'Smart scheduling with doctor matching and faster booking.', icon: CalendarCheck2 },
    { title: 'Smart Pharmacy Queue', description: 'Track medicine preparation and reduce waiting time.', icon: PillBottle },
    { title: 'Voice Assistant', description: 'Ask health queries using speech-to-text and voice responses.', icon: Mic },
    { title: 'Report Explanation', description: 'Understand complex lab reports in simple language.', icon: FileText }
  ];

  const steps = [
    { title: 'Step 1: Login', icon: LogIn },
    { title: 'Step 2: Book Appointment', icon: Stethoscope },
    { title: 'Step 3: Get Medicines', icon: PackageCheck }
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white text-gray-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <section className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">Smart Hospital Assistant</h1>
          <p className="mt-4 text-lg text-gray-600">AI-powered healthcare made simple</p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/login"><Button>Login</Button></Link>
            <Link to="/register"><Button variant="secondary">Get Started</Button></Link>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-semibold text-center mb-8">Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="bg-white border border-blue-100 rounded-xl shadow-sm p-5">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="mt-4 font-semibold text-gray-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-semibold text-center mb-8">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="bg-white border border-blue-100 rounded-xl shadow-sm p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white mx-auto flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="mt-4 font-medium text-gray-900">{step.title}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-blue-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-gray-900">Contact</h4>
            <p className="text-sm text-gray-600 mt-2">Email: support@smarthospital.demo</p>
            <p className="text-sm text-gray-600">Phone: +91 90000 00000</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">About</h4>
            <p className="text-sm text-gray-600 mt-2">Smart Hospital Assistant helps hospitals improve care experience using AI, NLP, and automation.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
