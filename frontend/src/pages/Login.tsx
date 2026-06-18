// TrustShield AI - Channel Authentication Portal
// Bank of Baroda Hackathon 2026

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shield, KeyRound, User, ChevronLeft, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract navigation parameters passed from Landing Page
  const initialRole = location.state?.role || 'Customer';
  const initialUsername = location.state?.username || 'cust_rajesh';

  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState('password123'); // Default password seeded
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update form inputs if landing navigation changes
  useEffect(() => {
    if (location.state?.username) {
      setUsername(location.state.username);
    }
  }, [location.state]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Fetch simulator parameters from local storage to simulate device parameters
    const vpnActive = localStorage.getItem('trustshield_sim_vpn') === 'true';
    const locationChanged = localStorage.getItem('trustshield_sim_location') === 'true';
    const untrustedDevice = localStorage.getItem('trustshield_sim_device') || 'fp_sunita_desktop_0021';
    const failedLogins = localStorage.getItem('trustshield_sim_failed') || '0';

    const loginHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-device-fingerprint': untrustedDevice,
      'x-device-name': initialRole === 'Customer' ? 'Rajesh OnePlus 11' : 'Sunita Workstation',
      'x-device-type': initialRole === 'Customer' ? 'Mobile' : 'Desktop',
      'x-os-name': initialRole === 'Customer' ? 'Android 13' : 'Windows 10',
      'x-browser-name': 'Chrome',
      'x-client-ip': vpnActive ? '185.190.140.22' : '103.241.12.44', // VPN proxies ip
      'x-client-city': vpnActive ? 'Amsterdam' : 'Mumbai',
      'x-client-country': vpnActive ? 'Netherlands' : 'India',
      'x-vpn-used': vpnActive ? 'true' : 'false',
      'x-location-changed': locationChanged ? 'true' : 'false',
      'x-failed-logins': failedLogins
    };

    try {
      const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: loginHeaders,
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        onLoginSuccess(data.user, data.token);
        
        // Route to appropriate dashboard depending on role
        if (data.user.role === 'Customer') navigate('/customer');
        else if (['Employee', 'BranchManager'].includes(data.user.role)) navigate('/employee');
        else if (data.user.role === 'SecurityAnalyst') navigate('/soc');
        else if (data.user.role === 'Admin') navigate('/admin');
        else navigate('/');
      } else {
        setError(data.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Identity authentication server offline.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen cyber-grid bg-[#060913] flex flex-col items-center justify-center p-4 font-sans relative selection:bg-bob-orange selection:text-white">
      {/* Return to home button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 text-xs text-slate-400 hover:text-slate-100 flex items-center gap-1 bg-slate-950/45 hover:bg-slate-900 border border-slate-800/80 px-3.5 py-2 rounded-xl transition-all"
      >
        <ChevronLeft size={14} />
        Back to Channels
      </button>

      <div className="w-full max-w-md bg-slate-950/40 border border-cyber-border glass-card rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-bob-orange to-red-500"></div>

        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-bob-orange/10 border border-bob-orange/20 text-bob-orange flex items-center justify-center mx-auto mb-4 shadow-lg shadow-bob-orange/15">
            <Shield size={26} />
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide uppercase">TrustShield AI Gateway</h2>
          <span className="text-[10px] text-bob-orange font-bold uppercase tracking-widest font-mono">Bank of Baroda Channels</span>
        </div>

        {/* Error notification */}
        {error && (
          <div className="bg-red-950/50 border border-red-800/80 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-red-300 mb-6">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-5">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">System Username</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900/40 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-slate-100 placeholder-slate-600 outline-none focus:border-bob-orange transition-colors"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">Credentials Token (Password)</label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/40 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-slate-100 placeholder-slate-600 outline-none focus:border-bob-orange transition-colors"
                required
              />
            </div>
          </div>

          {/* Portal metadata display */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-xl px-4 py-3 flex justify-between items-center text-[10px] text-slate-500 font-mono">
            <span>Security context:</span>
            <span className="text-cyber-glow font-bold uppercase">{initialRole}</span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-bob-orange to-red-500 hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg shadow-bob-orange/10"
          >
            {loading ? 'Authenticating...' : 'Authenticate Channel'}
          </button>
        </form>
      </div>
    </div>
  );
}
