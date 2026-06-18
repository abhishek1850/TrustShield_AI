// TrustShield AI - Admin Operations Portal
// Bank of Baroda Hackathon 2026

import React, { useState, useEffect } from 'react';
import { ShieldAlert, UserPlus, Users, Terminal, CheckCircle2, Lock, Unlock, FileText, Download } from 'lucide-react';

interface AdminDashboardProps {
  token: string;
  user: any;
  triggerRequest: (method: string, path: string, body?: any) => Promise<any>;
}

export default function AdminDashboard({ token, user, triggerRequest }: AdminDashboardProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState('All'); // All, Anomaly, Normal
  const [searchUsername, setSearchUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const fetchAdminData = async () => {
    try {
      const usersData = await triggerRequest('GET', '/api/admin/users');
      if (usersData) setUsers(usersData);

      const logsData = await triggerRequest('GET', '/api/admin/behavior-logs');
      if (logsData) setAuditLogs(logsData);
    } catch (err) {
      console.error("Admin data fetch error:", err);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleLock = async (userId: number, currentLockStatus: boolean) => {
    setStatusMsg('');
    try {
      const response = await triggerRequest('PUT', `/api/admin/users/${userId}/lock`, {
        isLocked: !currentLockStatus
      });
      if (response) {
        setStatusMsg(`User account successfully ${!currentLockStatus ? 'LOCKED' : 'UNLOCKED'}.`);
        fetchAdminData();
      }
    } catch (err: any) {
      setStatusMsg("Failed to update user lock: " + err.message);
    }
  };

  // Filter logic for audit logs
  const filteredLogs = auditLogs.filter(log => {
    const usernameMatch = log.username.toLowerCase().includes(searchUsername.toLowerCase());
    
    if (logFilter === 'Anomaly') {
      return usernameMatch && log.is_anomaly === true;
    }
    if (logFilter === 'Normal') {
      return usernameMatch && log.is_anomaly === false;
    }
    return usernameMatch;
  });

  const handleExportLogs = () => {
    let csvContent = 'id,username,role,action_type,resource,ip_address,is_anomaly,timestamp\n';
    filteredLogs.forEach(log => {
      csvContent += `${log.id},${log.username},${log.role},${log.action_type},${log.resource_accessed},${log.ip_address},${log.is_anomaly},${log.timestamp}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `trustshield_security_audit_${Date.now()}.csv`);
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 font-sans pb-16 selection:bg-bob-orange selection:text-white">
      {/* Top Banner */}
      <div className="bg-slate-950/40 border-b border-slate-900/60 px-6 py-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 tracking-wide text-white">
            <Terminal className="text-purple-500" size={24} />
            System Admin Console
          </h2>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mt-0.5">Global Configuration, Access Control & System Logs</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* User Identity Access Management Panel */}
        <div className="lg:col-span-1 glass-card rounded-2xl p-6 flex flex-col max-h-[640px]">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
            <Users size={14} className="text-purple-400" />
            Identity Access Directory (IAM)
          </h3>

          {statusMsg && (
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs text-cyber-glow mb-4 text-center font-mono font-semibold">
              {statusMsg}
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
            {users.map((u) => (
              <div 
                key={u.id}
                className="bg-slate-900/40 border border-slate-900/60 p-3.5 rounded-xl flex justify-between items-center hover:border-slate-800 transition-colors"
              >
                <div>
                  <span className="font-semibold text-xs text-slate-200 block">{u.username}</span>
                  <span className="text-[9px] text-slate-500 block font-mono">{u.email}</span>
                  <span className="text-[8px] bg-slate-850 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase inline-block mt-1">
                    {u.role}
                  </span>
                </div>

                <button
                  onClick={() => handleToggleLock(u.id, u.is_locked)}
                  className={`text-[10px] font-bold uppercase py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors ${
                    u.is_locked
                      ? 'bg-red-950 text-red-400 border border-red-900/40 hover:bg-red-900/10'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-900/40 hover:bg-emerald-900/10'
                  }`}
                >
                  {u.is_locked ? (
                    <>
                      <Lock size={12} />
                      Locked
                    </>
                  ) : (
                    <>
                      <Unlock size={12} />
                      Active
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Security Audit Trail Logs */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 flex flex-col max-h-[640px]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Terminal size={14} className="text-cyber-glow" />
              Security Behavior Audit Trail
            </h3>

            {/* Filter options */}
            <div className="flex gap-2 text-xs w-full md:w-auto">
              <input
                type="text"
                placeholder="User filter..."
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-[11px] text-slate-200 outline-none w-28 placeholder-slate-650"
              />
              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 outline-none"
              >
                <option value="All">All Logs</option>
                <option value="Anomaly">Flagged Anomalies</option>
                <option value="Normal">Normal Behavior</option>
              </select>

              <button
                onClick={handleExportLogs}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 p-1.5 rounded transition-colors"
                title="Export Filtered CSV"
              >
                <Download size={13} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                  <th className="py-2">Timestamp</th>
                  <th className="py-2">Username</th>
                  <th className="py-2">Action / Path</th>
                  <th className="py-2">Client IP</th>
                  <th className="py-2 text-right">Anomaly Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/20 text-slate-300">
                    <td className="py-2.5 font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2.5 font-semibold text-slate-200">
                      <div className="flex flex-col">
                        <span>{log.username}</span>
                        <span className="text-[8px] text-slate-500 uppercase font-mono">{log.role}</span>
                      </div>
                    </td>
                    <td className="py-2.5 font-mono max-w-[150px] truncate text-slate-400" title={log.action_type}>
                      {log.action_type}
                    </td>
                    <td className="py-2.5 font-mono text-slate-400">{log.ip_address}</td>
                    <td className="py-2.5 text-right">
                      {log.is_anomaly ? (
                        <span className="text-[8px] bg-red-950/60 text-red-400 border border-red-900/30 px-1.5 py-0.5 rounded font-mono font-bold uppercase animate-pulse">
                          Anomaly
                        </span>
                      ) : (
                        <span className="text-[8px] bg-emerald-950/60 text-emerald-400 border border-emerald-900/30 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                          Normal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-500 italic">No audit records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
