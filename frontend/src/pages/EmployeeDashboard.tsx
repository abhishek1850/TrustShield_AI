// TrustShield AI - Employee Portal Dashboard
// Bank of Baroda Hackathon 2026

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Search, Download, AlertTriangle, Database, Usb, LogOut } from 'lucide-react';

interface EmployeeDashboardProps {
  token: string;
  user: any;
  onLogout: () => void;
  triggerRequest: (method: string, path: string, body?: any) => Promise<any>;
}

export default function EmployeeDashboard({ token, user, onLogout, triggerRequest }: EmployeeDashboardProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [recordsCount, setRecordsCount] = useState(50);
  const [isExporting, setIsExporting] = useState(false);
  const [isMountingUsb, setIsMountingUsb] = useState(false);
  
  const [alertMsg, setAlertMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCustomers = async () => {
    try {
      const data = await triggerRequest('GET', '/api/employee/customers');
      if (data) setCustomers(data);
    } catch (err) {
      console.error("Failed to fetch customer logs: ", err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.account_no.includes(searchQuery) ||
    c.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportData = async () => {
    setIsExporting(true);
    setAlertMsg('');
    setErrorMsg('');

    try {
      // Direct GET trigger which passes recordsCount. If recordsCount > 1000, middleware triggers MFA or lockout!
      const downloadPath = `/api/analytics/export?recordsCount=${recordsCount}`;
      const result = await triggerRequest('GET', downloadPath);
      
      if (result) {
        // Trigger simulated browser file download
        const blob = new Blob([result], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', `bob_customers_export_${recordsCount}.csv`);
        a.click();
        
        setAlertMsg(`CSV Export for ${recordsCount} records downloaded successfully.`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Data export blocked by active risk evaluator.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSimulateUsb = async () => {
    setIsMountingUsb(true);
    setAlertMsg('');
    setErrorMsg('');

    try {
      // POST payload contains usbConnected: true, instantly triggering risk score > 90 and locking the user
      await triggerRequest('POST', '/api/employee/simulation/usb', { usbConnected: true });
    } catch (err: any) {
      setErrorMsg(err.message || 'System lock triggered.');
      // The session termination is handled globally by the App.tsx token handler
    } finally {
      setIsMountingUsb(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 font-sans pb-12 selection:bg-bob-orange selection:text-white">
      {/* Navbar */}
      <nav className="border-b border-slate-900/60 bg-slate-950/20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-bob-orange to-red-500 flex items-center justify-center text-white">
              <Database size={18} />
            </div>
            <span className="font-bold text-sm tracking-wide">BOB Branch Portal</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">Staff Agent: <span className="text-white font-bold">{user.username} ({user.role})</span></span>
            <button
              onClick={onLogout}
              className="text-slate-400 hover:text-white border border-slate-800/80 hover:bg-slate-900 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LogOut size={13} />
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Operations Simulator */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Data Export Box */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-bob-orange"></div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <Download size={14} className="text-bob-orange" />
              Secure Data Exporter
            </h4>
            
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">
              Export branch customer records for offline compliance audit. High-volume exports are audited for insider-threat anomalies.
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                  <span>Export Size</span>
                  <span className="text-bob-orange font-bold font-mono">{recordsCount} records</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={8500}
                  step={10}
                  value={recordsCount}
                  onChange={(e) => setRecordsCount(parseInt(e.target.value))}
                  className="w-full accent-bob-orange bg-slate-900 rounded-lg appearance-none h-1 cursor-pointer"
                />
              </div>

              {recordsCount >= 5000 && (
                <div className="bg-amber-950/45 border border-amber-800/80 p-3 rounded-lg text-[10px] text-amber-300 flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>High download volume triggers dynamic MFA & branch validation.</span>
                </div>
              )}

              <button
                onClick={handleExportData}
                disabled={isExporting}
                className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-white font-semibold text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <Download size={13} className="text-bob-orange animate-pulse" />
                {isExporting ? 'Exporting...' : 'Export Customer CSV'}
              </button>
            </div>
          </div>

          {/* USB Mount Simulator */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <Usb size={14} className="text-red-400" />
              Branch USB Simulation
            </h4>
            
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">
              Simulate connecting an external unapproved flash drive to the workstation to copy customer logs.
            </p>

            <button
              onClick={handleSimulateUsb}
              disabled={isMountingUsb}
              className="w-full bg-red-950/20 border border-red-900/50 hover:bg-red-900/20 text-red-200 font-bold text-xs py-3 rounded-lg transition-colors flex items-center justify-center gap-2 uppercase tracking-wide shadow-lg"
            >
              <Usb size={15} className="animate-pulse" />
              {isMountingUsb ? 'Mounting Drive...' : 'Simulate USB Mount'}
            </button>
          </div>

        </div>

        {/* Right Side: Customer Search Directory */}
        <div className="lg:col-span-3 space-y-6">
          
          {alertMsg && (
            <div className="bg-emerald-950/40 border border-emerald-800/80 p-4 rounded-2xl text-xs text-emerald-300">
              {alertMsg}
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-950/40 border border-red-800/80 p-4 rounded-2xl text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          {/* Customer Directory Table */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300">Branch Customer Directory</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Workstation node query connection: Active</p>
              </div>

              {/* Search input */}
              <div className="relative w-full md:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search name, account, city..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-bob-orange transition-colors"
                />
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5">Account ID</th>
                    <th className="py-2.5">Full Name</th>
                    <th className="py-2.5">Balance</th>
                    <th className="py-2.5">Registered City</th>
                    <th className="py-2.5">Contact Phone</th>
                    <th className="py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {filteredCustomers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-900/20 text-slate-300">
                      <td className="py-3 font-mono text-slate-400">{cust.account_no}</td>
                      <td className="py-3 font-semibold text-slate-200">{cust.name}</td>
                      <td className="py-3 font-bold">{cust.balance}</td>
                      <td className="py-3">{cust.city}</td>
                      <td className="py-3 font-mono text-slate-400">{cust.phone}</td>
                      <td className="py-3 text-right">
                        <span className="text-[9px] bg-emerald-950/60 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/30 font-semibold font-mono">
                          {cust.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-500 italic">No matching customers found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
