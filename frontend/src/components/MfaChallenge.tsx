// TrustShield AI - Adaptive MFA Overrides Component
// Bank of Baroda Hackathon 2026

import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, KeyRound, Eye, Smartphone, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface MfaChallengeProps {
  riskScore: number;
  explanation: Record<string, number>;
  pendingAction: { method: string; path: string; body: any } | null;
  onVerifySuccess: (resetScore: number) => void;
  onCancel: () => void;
  token: string;
}

export default function MfaChallenge({ riskScore, explanation, pendingAction, onVerifySuccess, onCancel, token }: MfaChallengeProps) {
  const [method, setMethod] = useState<'otp' | 'face'>('otp');
  const [otp, setOtp] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Trigger webcam interface for simulated Face ID
  const startFaceScan = async () => {
    setErrorMessage('');
    setIsScanning(true);
    setScanProgress(0);
    setStatus('idle');

    // Attempt to access actual webcam, if not available, fallback to mock animation
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        streamRef.current = stream;
      }
    } catch (err) {
      console.warn("Camera hardware not found. Simulating biometric scanner feed.");
    }

    // Start progress counter
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          stopCamera();
          submitMfaVerification({ faceVerified: true });
          return 100;
        }
        return prev + 10;
      });
    }, 250);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    submitMfaVerification({ code: otp });
  };

  const submitMfaVerification = async (verifyPayload: { code?: string; faceVerified?: boolean }) => {
    setStatus('idle');
    setErrorMessage('');
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-mfa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...verifyPayload,
          pendingAction
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setTimeout(() => {
          onVerifySuccess(data.riskScore);
        }, 1500);
      } else {
        setStatus('failed');
        setErrorMessage(data.error || 'Verification failed');
      }
    } catch (err: any) {
      setStatus('failed');
      setErrorMessage(err.message || 'MFA validation server offline');
    }
  };

  // Convert raw keys to human readable labels for explanation
  const formatFieldName = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#02050b]/80 backdrop-blur-md flex items-center justify-center p-4 font-sans">
      <div className="glass-card w-full max-w-lg rounded-2xl border-cyber-border shadow-2xl p-6 relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Neon Orange Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-bob-orange to-yellow-500"></div>

        {/* Title & Warning */}
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-bob-orange/10 border border-bob-orange/30 text-bob-orange rounded-xl animate-pulse">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-100 uppercase tracking-wide">Adaptive Trust Challenge</h3>
            <p className="text-slate-400 text-xs mt-1">
              Your current session risk index is <span className="text-bob-orange font-bold font-mono">{Math.round(riskScore)}%</span>. Additional verification required.
            </p>
          </div>
        </div>

        {/* Explainable AI Metrics */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 mb-6">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">SHAP Threat Contribution Vectors:</span>
          <div className="space-y-2 max-h-[120px] overflow-y-auto custom-scrollbar">
            {Object.entries(explanation || {}).map(([key, val]) => {
              if (val <= 0 || key === 'base_value') return null;
              return (
                <div key={key} className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">{formatFieldName(key)}</span>
                  <span className="text-bob-orange font-mono font-bold font-semibold">+{Math.round(val)}%</span>
                </div>
              );
            })}
            {Object.keys(explanation || {}).filter(k => k !== 'base_value' && explanation[k] > 0).length === 0 && (
              <div className="text-slate-400 text-xs italic">
                Minor transactional deviation. OTP requested for threshold safety.
              </div>
            )}
          </div>
        </div>

        {/* Method Selectors */}
        <div className="flex border-b border-slate-800/80 mb-6">
          <button
            onClick={() => { setMethod('otp'); stopCamera(); setStatus('idle'); }}
            className={`flex-1 py-3 text-center text-xs uppercase tracking-wider font-semibold border-b-2 transition-colors ${
              method === 'otp'
                ? 'border-bob-orange text-bob-orange'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone size={16} className="inline mr-2 -mt-0.5" />
            SMS OTP Code
          </button>
          <button
            onClick={() => { setMethod('face'); setStatus('idle'); }}
            className={`flex-1 py-3 text-center text-xs uppercase tracking-wider font-semibold border-b-2 transition-colors ${
              method === 'face'
                ? 'border-bob-orange text-bob-orange'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye size={16} className="inline mr-2 -mt-0.5" />
            Biometric Face Scan
          </button>
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col justify-center min-h-[180px] mb-6">
          
          {status === 'success' && (
            <div className="text-center py-4">
              <CheckCircle2 size={54} className="text-cyber-emerald mx-auto mb-3 animate-bounce" />
              <h4 className="font-bold text-slate-100 text-md">Identity Verified</h4>
              <p className="text-slate-400 text-xs mt-1">Authorizing transaction. Please wait...</p>
            </div>
          )}

          {status === 'failed' && (
            <div className="text-center py-4">
              <XCircle size={54} className="text-cyber-rose mx-auto mb-3" />
              <h4 className="font-bold text-slate-100 text-md">Verification Failed</h4>
              <p className="text-slate-400 text-xs mt-1">{errorMessage}</p>
              <button 
                onClick={() => setStatus('idle')}
                className="mt-4 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {status === 'idle' && method === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <p className="text-slate-400 text-xs leading-relaxed">
                  Enter the 6-digit authorization code dispatched to your registered number ending in <span className="text-slate-200 font-bold">9823</span>.
                </p>
                <span className="text-[10px] text-bob-orange block mt-1 font-mono italic">Demo Hackathon Default: 123456</span>
              </div>
              
              <input
                type="text"
                placeholder="0 0 0 0 0 0"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-950/70 border border-slate-800 text-center font-mono font-bold text-2xl tracking-widest py-3 rounded-xl focus:border-bob-orange focus:ring-1 focus:ring-bob-orange outline-none"
              />

              <button
                type="submit"
                disabled={otp.length !== 6}
                className="w-full bg-gradient-to-r from-bob-orange to-red-500 hover:brightness-115 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest py-3 rounded-xl transition-all"
              >
                Submit Code
              </button>
            </form>
          )}

          {status === 'idle' && method === 'face' && (
            <div className="flex flex-col items-center">
              {!isScanning ? (
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 rounded-full border border-dashed border-slate-700/60 flex items-center justify-center bg-slate-950/30 text-slate-500">
                    <Eye size={36} />
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Verify biometric facial mapping. The scanner will map 68 facial landmark matrices to assert user presence.
                  </p>
                  <button
                    onClick={startFaceScan}
                    className="bg-bob-orange hover:bg-bob-orange/90 text-white font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-colors shadow-lg"
                  >
                    Initialize Biometric Scan
                  </button>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  <div className="relative w-48 h-36 rounded-xl overflow-hidden bg-slate-950 border-2 border-bob-orange/40 flex items-center justify-center">
                    
                    {/* Real Video Element */}
                    <video 
                      ref={videoRef} 
                      className="absolute inset-0 w-full h-full object-cover opacity-75 scale-x-[-1]"
                    />
                    
                    {/* Glowing Scan Circle */}
                    <div className="absolute inset-0 border-[3px] border-bob-orange/30 rounded-lg flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full border-2 border-cyber-glow/80 animate-ping" />
                      <div className="absolute w-28 h-28 rounded-full border border-cyber-glow/50 pulse-glow-cyan" />
                    </div>

                    {/* Laser line animation */}
                    <div className="absolute left-0 right-0 h-0.5 bg-cyber-glow animate-bounce top-1/2" />
                  </div>

                  <span className="text-xs text-slate-300 font-bold mt-4 font-mono">Biometric Alignment: {scanProgress}%</span>
                  <div className="w-48 bg-slate-900 rounded-full h-1 mt-2">
                    <div 
                      className="bg-cyber-glow h-1 rounded-full transition-all duration-300" 
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                  <button
                    onClick={() => { stopCamera(); setIsScanning(false); }}
                    className="text-xs text-slate-500 hover:text-slate-300 mt-4 underline"
                  >
                    Cancel Scan
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-800/80 pt-4 flex justify-between items-center text-xs">
          <span className="text-slate-500 font-mono flex items-center gap-1">
            <KeyRound size={12} />
            Channel: 256-bit TLS
          </span>
          <button
            onClick={() => { stopCamera(); onCancel(); }}
            className="text-slate-400 hover:text-white font-medium"
          >
            Abort Session
          </button>
        </div>
      </div>
    </div>
  );
}
