// TrustShield AI - Developer Simulation Console
// Bank of Baroda Hackathon 2026

import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, Cpu, ToggleLeft, ToggleRight } from 'lucide-react';

export interface SimState {
  vpnActive: boolean;
  locationChanged: boolean;
  untrustedDevice: boolean;
  failedLogins: number;
}

interface DeveloperSimulatorProps {
  onSimStateChange: (state: SimState) => void;
}

export default function DeveloperSimulator({ onSimStateChange }: DeveloperSimulatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [simState, setSimState] = useState<SimState>({
    vpnActive: false,
    locationChanged: false,
    untrustedDevice: false,
    failedLogins: 0
  });

  const toggleVpn = () => updateState({ vpnActive: !simState.vpnActive });
  const toggleLocation = () => updateState({ locationChanged: !simState.locationChanged });
  const toggleDevice = () => updateState({ untrustedDevice: !simState.untrustedDevice });
  const incrementFailedLogins = () => updateState({ failedLogins: (simState.failedLogins + 1) % 5 });

  const updateState = (newState: Partial<SimState>) => {
    const updated = { ...simState, ...newState };
    setSimState(updated);
    onSimStateChange(updated);
    
    // Save to local storage for Axios request interceptors
    localStorage.setItem('trustshield_sim_vpn', updated.vpnActive ? 'true' : 'false');
    localStorage.setItem('trustshield_sim_location', updated.locationChanged ? 'true' : 'false');
    localStorage.setItem('trustshield_sim_device', updated.untrustedDevice ? 'untrusted_fp_8829' : 'fp_sunita_desktop_0021');
    localStorage.setItem('trustshield_sim_failed', updated.failedLogins.toString());
  };

  useEffect(() => {
    // Initialise local storage values
    updateState(simState);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-bob-orange to-red-500 hover:brightness-110 text-white px-4 py-3 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <Cpu size={20} className="animate-spin" style={{ animationDuration: '3s' }} />
          <span className="font-semibold text-sm tracking-wide">Threat Simulator</span>
        </button>
      ) : (
        <div className="glass-card w-80 p-5 rounded-2xl border-cyber-border shadow-2xl relative overflow-hidden">
          {/* Header background glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-bob-orange to-cyber-glow"></div>
          
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-bob-orange">
              <ShieldAlert size={18} />
              <h3 className="font-bold text-sm uppercase tracking-wider">Attack & Anomaly Console</h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md transition-colors"
            >
              Minimize
            </button>
          </div>

          <p className="text-slate-400 text-xs mb-4 leading-relaxed">
            Simulate telemetry anomalies to test how the AI engine updates the session risk score and triggers authentication overrides.
          </p>

          <div className="space-y-3">
            {/* VPN Toggle */}
            <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/40">
              <span className="text-xs font-semibold text-slate-200">VPN Usage (IP Proxy)</span>
              <button onClick={toggleVpn} className="text-cyber-glow focus:outline-none">
                {simState.vpnActive ? (
                  <ToggleRight size={36} className="text-bob-orange" />
                ) : (
                  <ToggleLeft size={36} className="text-slate-500" />
                )}
              </button>
            </div>

            {/* Location Changed Toggle */}
            <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/40">
              <span className="text-xs font-semibold text-slate-200">Impossible Travel (Geo-hop)</span>
              <button onClick={toggleLocation} className="text-cyber-glow focus:outline-none">
                {simState.locationChanged ? (
                  <ToggleRight size={36} className="text-cyber-glow" />
                ) : (
                  <ToggleLeft size={36} className="text-slate-500" />
                )}
              </button>
            </div>

            {/* Untrusted Device Toggle */}
            <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/40">
              <span className="text-xs font-semibold text-slate-200">Unregistered Device FP</span>
              <button onClick={toggleDevice} className="text-cyber-glow focus:outline-none">
                {simState.untrustedDevice ? (
                  <ToggleRight size={36} className="text-cyber-glow" />
                ) : (
                  <ToggleLeft size={36} className="text-slate-500" />
                )}
              </button>
            </div>

            {/* Failed Logins Counter */}
            <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/40">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">Failed Logins</span>
                <span className="text-[10px] text-slate-500">Simulate brute force logs</span>
              </div>
              <button 
                onClick={incrementFailedLogins}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs py-1.5 px-3 rounded transition-colors"
              >
                {simState.failedLogins} Attempts
              </button>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-mono">Channel: REST Headers</span>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Intercept Active
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
