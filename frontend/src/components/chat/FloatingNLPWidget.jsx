import React, { useMemo, useState } from 'react';
import { Bot, Minus, Maximize2, Minimize2, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NLPChat from './NLPChat';

const HIDDEN_ROUTES = ['/', '/auth', '/login', '/register'];

const FloatingNLPWidget = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [chatSessionKey, setChatSessionKey] = useState(0);

  const handleMinimize = () => {
    setIsOpen(false);
  };

  const handleMaximizeToggle = () => {
    setIsMaximized((prev) => !prev);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMaximized(false);
    setChatSessionKey((prev) => prev + 1);
  };

  const shouldHide = useMemo(() => {
    if (!isAuthenticated) return true;
    return HIDDEN_ROUTES.includes(location.pathname);
  }, [isAuthenticated, location.pathname]);

  if (shouldHide) return null;

  return (
    <>
      {isOpen && (
        <div className={`fixed z-1000 shadow-2xl border border-gray-200 bg-white overflow-hidden ${
          isMaximized
            ? 'inset-4 rounded-xl'
            : 'bottom-24 right-6 w-[min(92vw,380px)] h-[min(78vh,620px)] rounded-2xl'
        }`}>
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleMinimize}
              className="h-7 w-7 rounded-full bg-white/90 text-gray-600 hover:text-gray-900 flex items-center justify-center border border-gray-200"
              aria-label="Minimize AI chat"
              title="Minimize"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleMaximizeToggle}
              className="h-7 w-7 rounded-full bg-white/90 text-gray-600 hover:text-gray-900 flex items-center justify-center border border-gray-200"
              aria-label={isMaximized ? 'Restore AI chat size' : 'Maximize AI chat'}
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="h-7 w-7 rounded-full bg-white/90 text-gray-600 hover:text-gray-900 flex items-center justify-center border border-gray-200"
              aria-label="Close AI chat"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <NLPChat key={chatSessionKey} />
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-1000 h-14 w-14 rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 flex items-center justify-center"
        aria-label="Open AI assistant"
      >
        <Bot className="w-7 h-7" />
      </button>
    </>
  );
};

export default FloatingNLPWidget;
