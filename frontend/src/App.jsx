import { useState } from 'react';
import { AuthProvider, useAuth, isAdmin } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import CaseDashboard from './pages/CaseDashboard';
import CaseDetail from './pages/CaseDetail';
import AdminPanel from './pages/AdminPanel';
import Home from './components/Home';
import { LogOut, User, Shield, FolderOpen } from 'lucide-react';
import forensixLogo from './assets/forensix-logo.png';

const roleColors = {
  admin: 'text-red-400 bg-red-500/10 border-red-500/30',
  forensic_officer: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  investigator: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  reviewer: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
};

function AppInner() {
  const { user, logout, loading } = useAuth();
  const [page, setPage] = useState('home');
  const [selectedCase, setSelectedCase] = useState(null);
  const [appPage, setAppPage] = useState('cases');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    if (page === 'home') {
      return <Home onNavigateToDashboard={() => setPage('login')} />;
    }
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      <nav className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-md px-3 sm:px-6 py-3 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-2 sm:gap-6">
          <button onClick={() => { setSelectedCase(null); setAppPage('cases'); }} className="hover:opacity-80 transition-opacity">
            <img src={forensixLogo} alt="ForensixAI" className="h-8 sm:h-10 w-auto object-contain" />
          </button>
          <div className="flex gap-1">
            <button onClick={() => { setSelectedCase(null); setAppPage('cases'); }}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors ${appPage === 'cases' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
              <FolderOpen size={13} /> <span className="hidden sm:inline">Cases</span>
            </button>
            {isAdmin(user) && (
              <button onClick={() => setAppPage('admin')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-colors ${appPage === 'admin' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
                <Shield size={13} /> <span className="hidden sm:inline">Admin</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`hidden sm:inline text-xs px-2 py-1 rounded-full border font-medium ${roleColors[user.role] || 'text-slate-400'}`}>
            {user.role.replace('_', ' ').toUpperCase()}
          </span>
          <span className="text-xs sm:text-sm text-slate-300 hidden md:inline">{user.full_name}</span>
          <button onClick={logout} className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white text-xs sm:text-sm transition-colors">
            <LogOut size={13} /> <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {appPage === 'admin' && isAdmin(user) ? (
          <AdminPanel />
        ) : selectedCase ? (
          <CaseDetail caseData={selectedCase} onBack={() => setSelectedCase(null)} />
        ) : (
          <CaseDashboard onSelectCase={(c) => { setSelectedCase(c); setAppPage('cases'); }} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
