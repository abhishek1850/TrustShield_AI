// TrustShield AI - SOC operations Control Dashboard
// Bank of Baroda Hackathon 2026

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, AlertCircle, RefreshCw, Layers, CheckCircle2, User, Globe, HelpCircle, HardDrive } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface SOCDashboardProps {
  token: string;
  user: any;
  triggerRequest: (method: string, path: string, body?: any) => Promise<any>;
}

export default function SOCDashboard({ token, user, triggerRequest }: SOCDashboardProps) {
  const [stats, setStats] = useState({
    totalAlerts: 2,
    activeAlerts: 2,
    openIncidents: 2,
    activeSessions: 3,
    averageRiskScore: 38,
    systemThreatLevel: 'Medium'
  });
  
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [shapLog, setShapLog] = useState<any>({
    username: 'emp_sunita',
    role: 'Employee',
    risk_score: 95,
    evaluated_at: new Date(),
    explanation: {
      usb_connected: 50,
      file_downloads_count: 35,
      role_type: 5,
      hour_of_day: 5,
      device_trusted: -15
    }
  });

  const [triageId, setTriageId] = useState<number | null>(null);
  const [triageStatus, setTriageStatus] = useState('Open');
  const [triageNotes, setTriageNotes] = useState('');
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainMsg, setRetrainMsg] = useState('');

  const fetchSOCData = async () => {
    try {
      const dashboardStats = await triggerRequest('GET', '/api/analytics/dashboard-stats');
      if (dashboardStats) setStats(dashboardStats);

      const sessions = await triggerRequest('GET', '/api/analytics/live-sessions');
      if (sessions) setLiveSessions(sessions);

      const alertsList = await triggerRequest('GET', '/api/soc/alerts');
      if (alertsList) setAlerts(alertsList);

      const incidentsList = await triggerRequest('GET', '/api/soc/incidents');
      if (incidentsList) setIncidents(incidentsList);

      const shapData = await triggerRequest('GET', '/api/analytics/shap-explanation');
      if (shapData && shapData.explanation) {
        setShapLog(shapData);
      }
    } catch (err) {
      console.error("SOC Data fetching error:", err);
    }
  };

  useEffect(() => {
    fetchSOCData();
    // Poll updates every 6 seconds to show dynamic threat adjustments
    const interval = setInterval(fetchSOCData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (triageId === null || !triageStatus || !triageNotes) return;

    try {
      await triggerRequest('PUT', `/api/soc/incidents/${triageId}`, {
        status: triageStatus,
        notes: triageNotes
      });
      setTriageId(null);
      setTriageNotes('');
      fetchSOCData();
    } catch (err: any) {
      alert("Triage update failed: " + err.message);
    }
  };

  const handleRetrain = async () => {
    setIsRetraining(true);
    setRetrainMsg('');
    try {
      const response = await fetch('http://localhost:8080/train', { method: 'POST' });
      if (response.ok) {
        setRetrainMsg('AI models retrained successfully.');
      } else {
        setRetrainMsg('ML Service retrain failure.');
      }
    } catch (err) {
      setRetrainMsg('Connection error: ML Service down.');
    } finally {
      setIsRetraining(false);
    }
  };

  // Maps SHAP fields to cleaner strings
  const formatFieldName = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 font-sans pb-16 selection:bg-bob-orange selection:text-white">
      {/* Top Banner */}
      <div className="bg-slate-950/40 border-b border-slate-900/60 px-6 py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 tracking-wide text-white">
            <Shield className="text-bob-orange" size={24} />
            TRUSTSHIELD AI SOC Operations Dashboard
          </h2>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mt-0.5">Continuous Threat Monitoring & Incident Response</span>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchSOCData}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={13} />
            Refresh Feed
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-2 lg:grid-cols-6 gap-5">
        
        <div className="glass-card p-4 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-bob-orange/10 border border-bob-orange/20 text-bob-orange rounded-lg">
            <AlertTriangle size={18} />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 font-semibold block uppercase">Total Alerts</span>
            <span className="text-lg font-bold font-mono text-white">{stats.totalAlerts}</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
            <AlertCircle size={18} />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 font-semibold block uppercase">Active Alerts</span>
            <span className="text-lg font-bold font-mono text-white">{stats.activeAlerts}</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
            <Layers size={18} />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 font-semibold block uppercase">Open Cases</span>
            <span className="text-lg font-bold font-mono text-white">{stats.openIncidents}</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg">
            <User size={18} />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 font-semibold block uppercase">Active Sessions</span>
            <span className="text-lg font-bold font-mono text-white">{stats.activeSessions}</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyber-glow rounded-lg">
            <RefreshCw size={18} className="animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 font-semibold block uppercase">System Risk Index</span>
            <span className="text-lg font-bold font-mono text-white">{stats.averageRiskScore}%</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl flex items-center gap-3">
          <div className={`p-2.5 rounded-lg border ${
            stats.systemThreatLevel === 'Low' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            stats.systemThreatLevel === 'Medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <Globe size={18} />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 font-semibold block uppercase">Threat Vector</span>
            <span className={`text-xs font-bold uppercase ${
              stats.systemThreatLevel === 'Low' ? 'text-emerald-400' :
              stats.systemThreatLevel === 'Medium' ? 'text-amber-400' : 'text-red-400'
            }`}>{stats.systemThreatLevel}</span>
          </div>
        </div>

      </div>

      {/* Row 1: Live Sessions & Geographic Threat Map */}
      <div className="max-w-7xl mx-auto px-6 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Active Sessions */}
        <div className="lg:col-span-1 glass-card rounded-2xl p-6 flex flex-col max-h-[440px]">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
            <User size={14} className="text-bob-orange" />
            Live Monitored User Sessions
          </h3>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
            {liveSessions.map((sess) => (
              <div 
                key={sess.id}
                className="bg-slate-900/40 border border-slate-900/60 p-3.5 rounded-xl hover:border-slate-800 transition-colors flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-slate-200">{sess.username}</span>
                    <span className="text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">{sess.role}</span>
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono mt-1 space-y-0.5">
                    <div>IP: {sess.ip_address} ({sess.location_city || 'India'})</div>
                    <div>Client: {sess.device_name || 'Browser'}</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[10px] font-bold font-mono px-2 py-1 rounded-md ${
                    sess.current_risk_score < 40 ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/40' :
                    sess.current_risk_score <= 70 ? 'bg-amber-950 text-amber-400 border border-amber-900/40 animate-pulse' : 'bg-red-950 text-red-400 border border-red-900/40 pulse-glow-rose'
                  }`}>
                    {sess.current_risk_score}% Risk
                  </span>
                </div>
              </div>
            ))}
            {liveSessions.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs italic">No active connections logged.</div>
            )}
          </div>
        </div>

        {/* Geographic Login Tracker Map */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 flex flex-col justify-between max-h-[440px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Globe size={14} className="text-cyber-glow" />
              Geographic Login Access Map
            </h3>
            <span className="text-[9px] bg-red-950/45 text-red-400 border border-red-900/20 px-2 py-0.5 rounded-full font-semibold font-mono flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
              Anomalous Geo-Hop Detected
            </span>
          </div>

          {/* Animated SVG Map Layout */}
          <div className="flex-1 w-full bg-slate-950/70 border border-slate-900 rounded-xl relative overflow-hidden flex items-center justify-center min-h-[220px]">
            <svg viewBox="0 0 800 400" className="w-full h-full opacity-60">
              {/* Standard Grid mapping points representing countries */}
              <circle cx="150" cy="120" r="3" fill="#334155" />
              <circle cx="180" cy="140" r="3" fill="#334155" />
              <circle cx="210" cy="130" r="4" fill="#334155" />
              <circle cx="260" cy="150" r="3" fill="#334155" />
              {/* Europe Area */}
              <circle cx="420" cy="140" r="4" fill="#64748b" />
              <circle cx="440" cy="130" r="5" fill="#38bdf8" className="pulse-glow-cyan" /> {/* Amsterdam Node */}
              <text x="440" y="115" fill="#00f0ff" fontSize="9" fontFamily="Outfit" textAnchor="middle" fontWeight="bold">Amsterdam Node (VPN)</text>
              
              {/* India Area */}
              <circle cx="580" cy="220" r="6" fill="#F05A28" className="animate-ping" />
              <circle cx="580" cy="220" r="6" fill="#F05A28" /> {/* Mumbai Node */}
              <text x="580" y="240" fill="#fff" fontSize="10" fontFamily="Outfit" textAnchor="middle" fontWeight="bold">Mumbai Core Node</text>

              <circle cx="560" cy="200" r="4" fill="#64748b" /> {/* Baroda Node */}
              <text x="530" y="195" fill="#e2e8f0" fontSize="8" fontFamily="Outfit" fontWeight="semibold">Baroda</text>

              {/* Impossible travel threat line path */}
              <path 
                d="M 580 220 Q 510 160 440 130" 
                fill="none" 
                stroke="#f43f5e" 
                strokeWidth="2.5" 
                strokeDasharray="5,5"
                className="animate-pulse"
              />
              <circle cx="510" cy="170" r="4" fill="#f43f5e" className="animate-bounce" />
              <text x="510" y="155" fill="#f43f5e" fontSize="9" fontFamily="Outfit" fontWeight="bold">Impossible Travel Speed: 8,400km/h</text>
            </svg>
            
            {/* Map Legends */}
            <div className="absolute bottom-3 left-4 text-[9px] text-slate-500 font-mono space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-bob-orange"></span>
                <span>Authorized Core logins</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyber-glow"></span>
                <span>VPN proxy access</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                <span>Impossible travel warning</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Row 2: Incident Management & Explainable AI (SHAP) Waterfall */}
      <div className="max-w-7xl mx-auto px-6 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Incident management Triage */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 flex flex-col">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
            <Layers size={14} className="text-bob-orange" />
            Active SOC Incident Triage File
          </h3>

          {/* Triage Update overlay form */}
          {triageId !== null && (
            <form onSubmit={handleTriageSubmit} className="bg-slate-900 border border-slate-800 p-4 rounded-xl mb-4 space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-300">Triage Case File #{triageId}</span>
                <button 
                  type="button" 
                  onClick={() => setTriageId(null)}
                  className="text-slate-500 hover:text-slate-300 underline"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold block">Triage Action Status</label>
                  <select
                    value={triageStatus}
                    onChange={(e) => setTriageStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded outline-none text-slate-300"
                  >
                    <option value="Open">Open (Awaiting triage)</option>
                    <option value="Investigating">Investigating (Auditing parameters)</option>
                    <option value="Resolved">Resolved (Close ticket)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold block">Triaged By</label>
                  <input
                    type="text"
                    value={user.username}
                    disabled
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded text-slate-500 cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-semibold block">Triage Diagnostics & Notes</label>
                <textarea
                  value={triageNotes}
                  onChange={(e) => setTriageNotes(e.target.value)}
                  placeholder="e.g. Employee Sunita confirmed USB connection was authorized by Manager Amit for compliance audit. Verified via intercom. Unlocking AD."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-850 p-2 rounded outline-none text-slate-300 placeholder-slate-700 font-sans"
                  required
                />
              </div>

              <button
                type="submit"
                className="bg-bob-orange hover:bg-bob-orange/90 text-white font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 size={13} />
                Submit Case Decision
              </button>
            </form>
          )}

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5">ID</th>
                  <th className="py-2.5">Flagged Node</th>
                  <th className="py-2.5">Alert Event</th>
                  <th className="py-2.5">Severity</th>
                  <th className="py-2.5">Notes / Resolution</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-900/20 text-slate-300">
                    <td className="py-3 font-mono text-slate-500 font-semibold">#{inc.id}</td>
                    <td className="py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-200">{inc.user_flagged || 'Unknown'}</span>
                        <span className="text-[9px] text-slate-500 font-mono">IP: {inc.ip_address}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-col max-w-[200px]">
                        <span className="font-semibold text-bob-orange text-[10px] font-mono leading-tight">{inc.alert_type}</span>
                        <span className="text-[9px] text-slate-500 leading-tight mt-0.5">{inc.description}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded border ${
                        inc.severity === 'Critical' ? 'bg-red-950/60 text-red-400 border-red-900/30' :
                        inc.severity === 'High' ? 'bg-amber-950/60 text-amber-400 border-amber-900/30' : 'bg-blue-950/60 text-blue-400 border-blue-900/30'
                      }`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-3 max-w-[180px] text-slate-400 italic leading-relaxed text-[11px] truncate">
                      {inc.notes || 'Awaiting manual triage investigation...'}
                    </td>
                    <td className="py-3 text-right">
                      {inc.status === 'Resolved' || inc.status === 'Closed' ? (
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1 font-mono">
                          <CheckCircle2 size={12} />
                          Closed
                        </span>
                      ) : (
                        <button
                          onClick={() => { setTriageId(inc.id); setTriageStatus(inc.status); setTriageNotes(inc.notes || ''); }}
                          className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-semibold hover:border-slate-700 transition-colors"
                        >
                          Triage
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {incidents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-500 italic">No security incidents logged.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Explainable AI (SHAP) Waterfall Chart */}
        <div className="lg:col-span-1 glass-card rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <HelpCircle size={14} className="text-cyber-glow" />
              Explainable AI (SHAP) Waterfall
            </h3>
            <p className="text-[9px] text-slate-500 mt-1 leading-relaxed">
              Diagnostic values showing feature weights for user <span className="text-slate-300 font-bold">{shapLog?.username}</span> (calculated risk: {shapLog?.risk_score}%).
            </p>
          </div>

          {/* Interactive Waterfall Rendering */}
          <div className="flex-1 w-full bg-slate-950/80 border border-slate-900/60 rounded-xl p-4 mt-4 space-y-3 max-h-[260px] overflow-y-auto custom-scrollbar">
            
            {/* Base Value starting point */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 font-mono uppercase">
                <span>Baseline System Risk</span>
                <span>15.00%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5">
                <div className="bg-slate-700 h-1.5 rounded-full" style={{ width: '15%' }} />
              </div>
            </div>

            {/* Feature lists contributions */}
            {Object.entries(shapLog?.explanation || {}).map(([key, val]: [string, any]) => {
              if (key === 'base_value' || val === 0) return null;
              
              const isPositive = val > 0;
              const barWidth = Math.min(Math.abs(val) * 1.5, 80); // scale up for visual nice size
              
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold text-slate-300">
                    <span>{formatFieldName(key)}</span>
                    <span className={isPositive ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {isPositive ? '+' : ''}{Math.round(val)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 relative">
                    <div 
                      className={`h-1.5 rounded-full ${isPositive ? 'bg-red-500 pulse-glow-rose' : 'bg-emerald-400 pulse-glow-cyan'}`} 
                      style={{ 
                        width: `${barWidth}%`,
                        marginLeft: !isPositive ? '0' : '15%' // visual offset mimicking waterfall
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-900 flex justify-between items-center text-[9px] text-slate-500 font-mono">
            <span>Model: XGBoost CPU</span>
            <span>SHAP additive verified</span>
          </div>
        </div>

      </div>

      {/* Row 3: ML Training Node & Alert Queue */}
      <div className="max-w-7xl mx-auto px-6 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ML Node Controls */}
        <div className="lg:col-span-1 glass-card rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <HardDrive size={14} className="text-bob-orange animate-pulse" />
              Machine Learning Node Status
            </h3>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              Manages offline Isolation Forest and XGBoost model parameters. Click below to trigger retraining on behavior history.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-900 rounded-xl p-4 my-4 text-xs space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Service Status:</span>
              <span className="text-emerald-400 font-bold uppercase tracking-wider">Online</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">UEBA Algorithms:</span>
              <span className="text-slate-300">IForest + XGBoost</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Active Features:</span>
              <span className="text-slate-300">11 vectors</span>
            </div>
          </div>

          {retrainMsg && (
            <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs text-cyber-glow mb-4 text-center font-semibold font-mono">
              {retrainMsg}
            </div>
          )}

          <button
            onClick={handleRetrain}
            disabled={isRetraining}
            className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white font-bold text-xs py-2.5 rounded-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
          >
            <RefreshCw size={13} className={isRetraining ? 'animate-spin' : ''} />
            {isRetraining ? 'Retraining Baseline Models...' : 'Retrain Baseline Model'}
          </button>
        </div>

        {/* Security Alerts Stream */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
            <AlertCircle size={14} className="text-red-400" />
            Real-Time Threat Alerts Stream
          </h3>

          <div className="overflow-y-auto max-h-[210px] custom-scrollbar space-y-3 pr-2">
            {alerts.map((al) => (
              <div 
                key={al.id} 
                className={`bg-slate-900/40 border p-3.5 rounded-xl text-xs flex justify-between items-start gap-4 ${
                  al.severity === 'Critical' ? 'border-red-900/30' : 'border-slate-900/80'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-400 font-mono text-[10px] uppercase tracking-wider">{al.alert_type}</span>
                    <span className={`text-[8px] font-bold font-mono px-2 py-0.5 rounded uppercase ${
                      al.severity === 'Critical' ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'
                    }`}>{al.severity}</span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">{al.description}</p>
                </div>
                
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {new Date(al.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs italic">No threat logs populated. System secure.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
