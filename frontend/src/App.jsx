import { useState } from 'react';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import forensixLogo from './assets/forensix-logo.png';

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  return (
    <div>
      {currentPage === 'home' ? (
        <Home onNavigateToDashboard={() => setCurrentPage('dashboard')} />
      ) : (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
          <nav className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-md px-8 py-4 flex justify-between items-center">
            <button 
              onClick={() => setCurrentPage('home')}
              className="flex items-center hover:opacity-80 transition-opacity"
              aria-label="Go to home"
            >
              <img src={forensixLogo} alt="Forensix AI" className="h-14 w-auto object-contain" />
            </button>
            <div className="text-sm font-medium text-slate-400">Internal Investigation Portal</div>
          </nav>
          <main className="max-w-7xl mx-auto p-8">
            <Dashboard onNavigateToHome={() => setCurrentPage('home')} />
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
