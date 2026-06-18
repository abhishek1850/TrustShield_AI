// TrustShield AI - Customer Dashboard Portal
// Bank of Baroda Hackathon 2026

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, ArrowUpRight, ShieldCheck, Laptop, Phone, Plus, History, LogOut } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CustomerDashboardProps {
  token: string;
  user: any;
  onLogout: () => void;
  triggerRequest: (method: string, path: string, body?: any) => Promise<any>;
}

export default function CustomerDashboard({ token, user, onLogout, triggerRequest }: CustomerDashboardProps) {
  const navigate = useNavigate();
  const [balance, setBalance] = useState('₹1,42,509.80');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [riskHistory, setRiskHistory] = useState<any[]>([]);
  const [txSuccess, setTxSuccess] = useState('');
  const [txError, setTxError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      // 1. Fetch Transactions
      const txData = await triggerRequest('GET', '/api/transactions');
      if (txData) setTransactions(txData);

      // 2. Fetch Devices
      const devRes = await fetch('http://localhost:5000/api/admin/devices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Fallback devices if devices endpoint needs mock or direct db
      const devData = await triggerRequest('GET', '/api/admin/behavior-logs');
      setDevices([
        { id: 1, name: 'Rajesh OnePlus 11', type: 'Mobile', status: 'Trusted', lastActive: 'Active now' },
        { id: 2, name: 'Rajesh Dell XPS', type: 'Laptop', status: 'Trusted', lastActive: '2 hours ago' }
      ]);

      // 3. Fetch historic risk scores to plot the trust index (Trust score = 100 - Risk Score)
      const logs = await triggerRequest('GET', '/api/analytics/historical-risk');
      if (logs) {
        // Filter logs belonging to the customer
        const userLogs = logs.filter((l: any) => l.username === user.username);
        const plotData = userLogs.map((l: any) => ({
          time: new Date(l.evaluated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          score: 100 - l.risk_score
        }));
        // Provide seed baseline if empty
        setRiskHistory(plotData.length > 0 ? plotData : [
          { time: '10:00 AM', score: 95 },
          { time: '11:30 AM', score: 95 },
          { time: '01:15 PM', score: 92 },
          { time: '03:40 PM', score: 95 }
        ]);
      }
    } catch (err) {
      console.error("Dashboard fetching error: ", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !amount) return;

    setLoading(true);
    setTxSuccess('');
    setTxError('');

    try {
      const result = await triggerRequest('POST', '/api/transactions', {
        amount: parseFloat(amount),
        recipientAccount: recipient,
        currency: 'INR'
      });

      if (result && result.transaction) {
        setTxSuccess(`Successfully transferred ₹${parseFloat(amount).toLocaleString()} to ${recipient}`);
        setRecipient('');
        setAmount('');
        // Deduct mock balance
        const currentBal = parseFloat(balance.replace(/[^\d.]/g, '')) - parseFloat(amount);
        setBalance(`₹${currentBal.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        fetchData();
      }
    } catch (err: any) {
      setTxError(err.message || 'Transaction blocked by security node.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 font-sans pb-12 selection:bg-bob-orange selection:text-white">
      {/* Navbar */}
      <nav className="border-b border-slate-900/60 bg-slate-950/20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-bob-orange flex items-center justify-center text-white">
              <Landmark size={18} />
            </div>
            <span className="font-bold text-sm tracking-wide">BOB Internet Banking</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">Welcome, <span className="text-white font-bold">{user.username}</span></span>
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
      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Balances & Quick Transfer) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Balance Board */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-bob-orange"></div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Available Balance</span>
            <h3 className="text-2xl font-extrabold text-white mt-1">{balance}</h3>
            <span className="text-[10px] text-emerald-400 font-mono mt-1 block">Account No: 9876543205</span>
          </div>

          {/* Quick Fund Transfer Form */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <ArrowUpRight size={14} className="text-bob-orange" />
              Transfer Funds (RTGS / IMPS)
            </h4>

            {txSuccess && (
              <div className="bg-emerald-950/40 border border-emerald-800/80 p-3 rounded-lg text-xs text-emerald-300 mb-4">
                {txSuccess}
              </div>
            )}

            {txError && (
              <div className="bg-red-950/40 border border-red-800/80 p-3 rounded-lg text-xs text-red-300 mb-4">
                {txError}
              </div>
            )}

            <form onSubmit={handleTransfer} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">Recipient Account Number</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-bob-orange"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">Transfer Amount (INR)</label>
                <input
                  type="text"
                  placeholder="e.g. 25000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-bob-orange"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-bob-orange hover:bg-bob-orange/90 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? 'Processing...' : 'Authorize RTGS Transfer'}
              </button>
            </form>
          </div>

          {/* Trusted Devices Register */}
          <div className="glass-card rounded-2xl p-6">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <ShieldCheck size={14} className="text-cyber-glow" />
              Trusted Devices Registry
            </h4>
            <div className="space-y-3">
              {devices.map((dev) => (
                <div key={dev.id} className="flex justify-between items-center bg-slate-900/30 p-2.5 rounded-lg border border-slate-900">
                  <div className="flex items-center gap-2.5">
                    {dev.type === 'Mobile' ? (
                      <Phone size={14} className="text-slate-400" />
                    ) : (
                      <Laptop size={14} className="text-slate-400" />
                    )}
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-200">{dev.name}</span>
                      <span className="text-[9px] text-slate-500 font-mono">{dev.lastActive}</span>
                    </div>
                  </div>
                  <span className="text-[9px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/30 font-semibold font-mono">
                    {dev.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Columns (Charts & History) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Identity Trust Index Chart */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300">Identity Trust Index</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Continuous evaluation score (100 minus calculated risk score)</p>
              </div>
              <span className="text-[10px] bg-cyber-emerald/10 text-cyber-emerald border border-cyber-emerald/20 px-2.5 py-0.5 rounded-full font-semibold">
                Privacy Protected
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riskHistory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090d16', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', fontSize: 11 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#F05A28" 
                    strokeWidth={2}
                    dot={{ fill: '#F05A28', strokeWidth: 1, r: 3 }}
                    activeDot={{ r: 5 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Transaction History Table */}
          <div className="glass-card rounded-2xl p-6">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <History size={14} className="text-bob-orange" />
              RTGS Transaction Audit Logs
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Recipient</th>
                    <th className="py-2.5">Currency</th>
                    <th className="py-2.5">Amount</th>
                    <th className="py-2.5 text-right">Security Matrix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-900/20 text-slate-300">
                      <td className="py-3 font-mono text-slate-400">{new Date(tx.created_at).toLocaleDateString()}</td>
                      <td className="py-3 font-semibold text-slate-200">{tx.recipient_account}</td>
                      <td className="py-3 font-mono">{tx.currency}</td>
                      <td className="py-3 font-bold">₹{parseFloat(tx.amount).toLocaleString()}</td>
                      <td className="py-3 text-right">
                        <span className="text-[9px] bg-emerald-950/60 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/30 font-semibold font-mono">
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-500 italic">No transactions executed yet.</td>
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
