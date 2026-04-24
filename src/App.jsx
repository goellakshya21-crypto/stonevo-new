import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import BuilderPortal from './pages/BuilderPortal';
import AdminPage from './pages/AdminPage';
import AdvisoryServices from './pages/AdvisoryServices';
import LeadGate from './components/LeadGate';

import { RequirementsProvider } from './context/RequirementsContext';

function App() {
  console.log('VITE_ENABLE_ADMIN:', import.meta.env.VITE_ENABLE_ADMIN);
  return (
    <RequirementsProvider>
      <Router>
        <Routes>
          <Route path="/" element={
            <LeadGate>
              {(role) => <Home role={role} />}
            </LeadGate>
          } />
          <Route path="/builder" element={<BuilderPortal />} />
          <Route path="/advisory" element={<AdvisoryServices />} />
          <Route path="/internal-management-stonevo-9921" element={<AdminPage />} />
          <Route path="*" element={<div className="min-h-screen bg-black text-white p-10">404 - Page not found</div>} />
        </Routes>
      </Router>
    </RequirementsProvider>
  );
}

export default App;
