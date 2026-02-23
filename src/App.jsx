import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import BuilderPortal from './pages/BuilderPortal';
import AdminPage from './pages/AdminPage';
import LeadGate from './components/LeadGate';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <LeadGate>
            {(role) => role === 'builder' ? <BuilderPortal /> : <Home />}
          </LeadGate>
        } />
        <Route path="/builder" element={<BuilderPortal />} />
        {import.meta.env.VITE_ENABLE_ADMIN === 'true' && (
          <Route path="/internal-management-stonevo-9921" element={<AdminPage />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;
