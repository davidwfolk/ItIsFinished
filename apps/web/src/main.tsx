import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PowerSyncContext } from '@powersync/react';
import { powersync, initDatabase } from './lib/powersync';
import './index.css';
import App from './App.tsx';

function Root() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => setReady(true))
      .catch((err) => {
        console.error('Failed to init local database:', err);
        setError(err.message);
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-red-400 flex items-center justify-center p-6">
        <div className="bg-zinc-900 border border-red-500/20 p-6 rounded-2xl max-w-md w-full">
          <h2 className="text-lg font-bold text-red-300 mb-2">Local SQLite Error</h2>
          <p className="text-sm text-zinc-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition"
          >
            Retry Database
          </button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Initializing Local SQLite Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <PowerSyncContext.Provider value={powersync}>
      <App />
    </PowerSyncContext.Provider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
