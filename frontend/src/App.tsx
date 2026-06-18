// TrustShield AI - React Application Core
// Bank of Baroda Hackathon 2026

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ShieldAlert, Landmark, LogIn, Lock } from 'lucide-react';

// Import Pages
import Landing from './pages/Landing.tsx';
import Login from './pages/Login.tsx';
import CustomerDashboard from './pages/CustomerDashboard.tsx';
import EmployeeDashboard from './pages/EmployeeDashboard.tsx';
import SOCDashboard from './pages/SOCDashboard.tsx';
import AdminDashboard from './pages/AdminDashboard.tsx';

// Import Components
import DeveloperSimulator, { SimState } from './components/DeveloperSimulator.tsx';
import MfaChallenge from './components/MfaChallenge.tsx';

// Master App Wrapper containing Router Context
export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const navigate = useNavigate();

  // Authentication states
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  
  // Threat simulation state
  const [simState, setSimState] = useState<SimState>({
    vpnActive: false,
    locationChanged: false,
    untrustedDevice: false,
    failedLogins: 0
  });

  // Modal Overlays
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [mfaRiskScore, setMfaRiskScore] = useState(0);
  const [mfaExplanation, setMfaExplanation] = useState<Record<string, number>>({});
  const [mfaPendingAction, setMfaPendingAction] = useState<{
    method: string;
    path: string;
    body: any;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  } | null>(null);

  const [showLockoutModal, setShowLockoutModal] = useState(false);
  const [lockoutRiskScore, setLockoutRiskScore] = useState(0);

  // Restore session from localStorage on boot
  useEffect(() => {
    const savedUser = localStorage.getItem('trustshield_user');
    const savedToken = localStorage.getItem('trustshield_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  const handleLoginSuccess = (userData: any, userToken: string) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('trustshield_user', JSON.stringify(userData));
    localStorage.setItem('trustshield_token', userToken);
  };

  const handleLogoutLocal = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('trustshield_user');
    localStorage.removeItem('trustshield_token');
  };

  const handleLogoutApi = async () => {
    try {
      const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (err) {
      console.warn("Logout request failed on server, cleaning local state.");
    } finally {
      handleLogoutLocal();
      navigate('/');
    }
  };

  // ---- Asynchronous Promise-Hijacked API Fetch Request Wrapper ----
  const triggerRequest = async (method: string, path: string, body?: any): Promise<any> => {
    // Read simulated headers directly from local storage parameters
    const vpnActive = localStorage.getItem('trustshield_sim_vpn') === 'true';
    const locationChanged = localStorage.getItem('trustshield_sim_location') === 'true';
    const untrustedDevice = localStorage.getItem('trustshield_sim_device') || 'fp_sunita_desktop_0021';
    const failedLogins = localStorage.getItem('trustshield_sim_failed') || '0';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-device-fingerprint': untrustedDevice,
      'x-device-name': user?.role === 'Customer' ? 'Rajesh OnePlus 11' : 'Sunita Workstation',
      'x-device-type': user?.role === 'Customer' ? 'Mobile' : 'Desktop',
      'x-os-name': user?.role === 'Customer' ? 'Android 13' : 'Windows 10',
      'x-browser-name': 'Chrome',
      'x-client-ip': vpnActive ? '185.190.140.22' : '103.241.12.44',
      'x-client-city': vpnActive ? 'Amsterdam' : 'Mumbai',
      'x-client-country': vpnActive ? 'Netherlands' : 'India',
      'x-vpn-used': vpnActive ? 'true' : 'false',
      'x-location-changed': locationChanged ? 'true' : 'false',
      'x-failed-logins': failedLogins
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${BACKEND_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });

      // Handle 403: Adaptive MFA Challenge trigger
      if (response.status === 403) {
        const errorData = await response.json();
        if (errorData.code === 'MFA_REQUIRED') {
          setMfaRiskScore(errorData.riskScore);
          setMfaExplanation(errorData.explanation || {});
          
          // Capture the transaction parameters inside a pending Promise
          return new Promise((resolve, reject) => {
            setMfaPendingAction({
              method,
              path,
              body,
              resolve,
              reject
            });
            setShowMfaModal(true);
          });
        }
      }

      // Handle 401: Lockout / Session Terminated
      if (response.status === 401) {
        const errorData = await response.json();
        if (errorData.code === 'SESSION_TERMINATED') {
          setLockoutRiskScore(errorData.riskScore);
          setShowLockoutModal(true);
          handleLogoutLocal();
          throw new Error('Session terminated due to high risk index.');
        }

        // Token expired / logged out
        handleLogoutLocal();
        navigate('/login');
        throw new Error(errorData.error || 'Session expired. Please log in.');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      // Assert CSV for exports, else JSON
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('text/csv')) {
        return await response.text();
      }

      return await response.json();

    } catch (err) {
      throw err;
    }
  };

  // Called when adaptive MFA is verified successfully
  const handleMfaSuccess = async (resetRiskScore: number) => {
    setShowMfaModal(false);
    
    if (mfaPendingAction) {
      const { method, path, body, resolve, reject } = mfaPendingAction;
      setMfaPendingAction(null);
      
      try {
        // Re-execute original pending transaction
        const retryResult = await triggerRequest(method, path, body);
        resolve(retryResult);
      } catch (retryErr) {
        reject(retryErr);
      }
    }
  };

  // Cancel MFA and discard action
  const handleMfaCancel = () => {
    setShowMfaModal(false);
    if (mfaPendingAction) {
      mfaPendingAction.reject(new Error('MFA challenge rejected by user.'));
      setMfaPendingAction(null);
    }
    handleLogoutLocal();
    navigate('/');
  };

  return (
    <>
      {/* Central Routing Engine */}
      <Routes>
        <Route path="/" element={<Landing user={user} token={token} onLogout={handleLogoutLocal} />} />
        <Route 
          path="/login" 
          element={
            (!token || !user) ? (
              <Login onLoginSuccess={handleLoginSuccess} />
            ) : user?.role === 'Customer' ? (
              <Navigate to="/customer" />
            ) : ['Employee', 'BranchManager'].includes(user?.role) ? (
              <Navigate to="/employee" />
            ) : user?.role === 'SecurityAnalyst' ? (
              <Navigate to="/soc" />
            ) : user?.role === 'Admin' ? (
              <Navigate to="/admin" />
            ) : (
              <Navigate to="/" />
            )
          } 
        />
        
        {/* Customer Portal */}
        <Route 
          path="/customer" 
          element={
            token && user?.role === 'Customer' 
              ? <CustomerDashboard token={token} user={user} onLogout={handleLogoutApi} triggerRequest={triggerRequest} /> 
              : <Navigate to="/" />
          } 
        />

        {/* Employee Branch Portal */}
        <Route 
          path="/employee" 
          element={
            token && ['Employee', 'BranchManager'].includes(user?.role) 
              ? <EmployeeDashboard token={token} user={user} onLogout={handleLogoutApi} triggerRequest={triggerRequest} /> 
              : <Navigate to="/" />
          } 
        />

        {/* SOC Analyst Panel */}
        <Route 
          path="/soc" 
          element={
            token && user?.role === 'SecurityAnalyst' 
              ? <SOCDashboard token={token} user={user} triggerRequest={triggerRequest} /> 
              : <Navigate to="/" />
          } 
        />

        {/* System Admin Panel */}
        <Route 
          path="/admin" 
          element={
            token && user?.role === 'Admin' 
              ? <AdminDashboard token={token} user={user} triggerRequest={triggerRequest} /> 
              : <Navigate to="/" />
          } 
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {/* Floating Anomaly Simulator Console (Rendered when logged in to help judging) */}
      {token && (
        <DeveloperSimulator onSimStateChange={setSimState} />
      )}

      {/* Adaptive authentication MFA overlay modal */}
      {showMfaModal && (
        <MfaChallenge
          riskScore={mfaRiskScore}
          explanation={mfaExplanation}
          pendingAction={mfaPendingAction ? {
            method: mfaPendingAction.method,
            path: mfaPendingAction.path,
            body: mfaPendingAction.body
          } : null}
          onVerifySuccess={handleMfaSuccess}
          onCancel={handleMfaCancel}
          token={token}
        />
      )}

      {/* Critical Threat Lockout Overlay */}
      {showLockoutModal && (
        <div className="fixed inset-0 z-50 bg-[#02050b]/90 backdrop-blur-lg flex items-center justify-center p-4 font-sans">
          <div className="glass-card max-w-md w-full p-6 text-center border-red-500/30 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse"></div>
            
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Lock size={30} />
            </div>

            <h3 className="font-extrabold text-lg text-slate-100 uppercase tracking-wide">Workstation Terminal Isolated</h3>
            <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block mt-1">Session Risk: {Math.round(lockoutRiskScore)}% - critical violation</span>
            
            <p className="text-slate-400 text-xs mt-4 leading-relaxed">
              The Identity Trust Engine has automatically terminated this session and locked the associated Active Directory account. Physical USB storage attachment or unauthorized downloads are blocked.
            </p>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 text-[10px] text-slate-500 font-mono text-left space-y-1 my-5">
              <div>System Code: BLOCKED_INSIDER_THREAT</div>
              <div>Audit Target: {user?.username || 'Branch Workstation'}</div>
              <div>Escalation assigned: Security Analyst (SOC)</div>
            </div>

            <button
              onClick={() => { setShowLockoutModal(false); navigate('/'); }}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-lg transition-colors shadow-lg shadow-red-500/10"
            >
              Return to Login Portal
            </button>
          </div>
        </div>
      )}
    </>
  );
}
