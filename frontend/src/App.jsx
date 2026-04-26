import Dashboard from './components/Dashboard';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="border-b bg-white px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs">FX</div>
          FORENSIX AI
        </h1>
        <div className="text-sm font-medium text-slate-500 underline">Internal Investigation Portal</div>
      </nav>
      <main className="max-w-7xl mx-auto p-8">
        <Dashboard />
      </main>
    </div>
  );
}

export default App;