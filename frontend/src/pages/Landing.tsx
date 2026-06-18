// TrustShield AI - Landing Page Gateway
// Bank of Baroda Hackathon 2026

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, MonitorCheck, Cpu, Landmark, UserSquare2, Compass } from 'lucide-react';

interface LandingProps {
  user?: any;
  token?: string;
  onLogout?: () => void;
}

export default function Landing({ user, token, onLogout }: LandingProps) {
  const navigate = useNavigate();

  const portals = [
    {
      name: 'Internet Banking',
      description: 'Customer account registry, balance queries, fund transfers, and trusted device logs.',
      icon: Landmark,
      color: 'from-blue-600 to-indigo-600',
      shadow: 'shadow-blue-500/20',
      role: 'Customer',
      userHint: 'cust_rajesh',
    },
    {
      name: 'Employee Branch Portal',
      description: 'Branch transactions, customer directories, data exports, and simulated peripheral USB events.',
      icon: UserSquare2,
      color: 'from-bob-orange to-red-500',
      shadow: 'shadow-bob-orange/20',
      role: 'Employee',
      userHint: 'emp_sunita',
    },
    {
      name: 'SOC Security Operations',
      description: 'Real-time threat feeds, active anomaly charts, Explainable SHAP charts, and automated actions.',
      icon: Shield,
      color: 'from-cyan-500 to-teal-500',
      shadow: 'shadow-cyan-500/20',
      role: 'SecurityAnalyst',
      userHint: 'analyst_vikram',
    },
    {
      name: 'Admin System Console',
      description: 'System roles audit, active session lockouts, configuration, and security behavior audit trails.',
      icon: MonitorCheck,
      color: 'from-purple-600 to-pink-600',
      shadow: 'shadow-purple-500/20',
      role: 'Admin',
      userHint: 'admin_system',
    },
  ];

  const handlePortalSelect = (portal: typeof portals[0]) => {
    if (token && user) {
      const roleMatches = (portal.role === 'Employee' && ['Employee', 'BranchManager'].includes(user.role)) ||
                          (portal.role === user.role);
      if (roleMatches) {
        if (user.role === 'Customer') navigate('/customer');
        else if (['Employee', 'BranchManager'].includes(user.role)) navigate('/employee');
        else if (user.role === 'SecurityAnalyst') navigate('/soc');
        else if (user.role === 'Admin') navigate('/admin');
        return;
      } else {
        if (onLogout) onLogout();
        setTimeout(() => {
          navigate('/login', { state: { role: portal.role, username: portal.userHint } });
        }, 50);
        return;
      }
    }
    navigate('/login', { state: { role: portal.role, username: portal.userHint } });
  };

  return (
    <div className="min-h-screen cyber-grid bg-[#060913] flex flex-col justify-between font-sans selection:bg-bob-orange selection:text-white">
      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center border-b border-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-bob-orange to-red-500 flex items-center justify-center text-white shadow-lg shadow-bob-orange/30">
            <Shield size={22} />
          </div>
          <div>
            <h1 className="text-md font-bold tracking-tight text-white flex items-center gap-1.5">
              TrustShield <span className="text-bob-orange">AI</span>
            </h1>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">Privacy-First Identity Trust</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
          <div className="flex items-center gap-1.5 bg-slate-900/50 border border-slate-800/80 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>BOB Core Network</span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 flex flex-col justify-center items-center w-full">
        <div className="text-center max-w-3xl mb-12">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent leading-tight">
            Continuous Identity Trust Framework
          </h2>
          <p className="text-slate-400 text-sm md:text-base mt-4 max-w-2xl mx-auto leading-relaxed">
            Protecting banking channels against insider threats, account takeovers, and session compromise with real-time behavioral diagnostics and Explainable AI.
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
          {portals.map((portal) => (
            <div
              key={portal.name}
              onClick={() => handlePortalSelect(portal)}
              className="glass-card hover:border-slate-700/80 hover:bg-slate-900/40 p-6 rounded-2xl cursor-pointer group transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3.5 rounded-xl bg-gradient-to-br ${portal.color} text-white shadow-lg ${portal.shadow} group-hover:scale-110 transition-transform duration-300`}>
                  <portal.icon size={24} />
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-100 group-hover:text-cyber-glow transition-colors">{portal.name}</h3>
                    <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700/60 font-semibold px-2 py-0.5 rounded-md font-mono">
                      {portal.role}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-2 leading-relaxed">{portal.description}</p>
                  
                  <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-mono">Simulate: {portal.userHint}</span>
                    <span className="text-bob-orange font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      Enter Portal &rarr;
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900/60 py-6 text-center text-[11px] text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-2">
          <span>&copy; 2026 TrustShield AI | Developed for Bank of Baroda Hackathon</span>
          <div className="flex gap-4">
            <span className="hover:text-slate-400 cursor-pointer">Security Compliance</span>
            <span className="hover:text-slate-400 cursor-pointer">UEBA Policy</span>
            <span className="hover:text-slate-400 cursor-pointer">SHAP Insights</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
