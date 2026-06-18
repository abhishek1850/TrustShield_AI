// TrustShield AI - Security Risk Evaluator Middleware
// Bank of Baroda Hackathon 2026

import { Request, Response, NextFunction } from 'express';
import { db } from '../config/db.js';
import { sendSmsOtp } from '../utils/sms.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// In-memory cache for validated MFA challenges (short-lived bypass)
export const validatedMfaActions = new Map<string, { timestamp: number, actionHash: string }>();

// In-memory cache for generated SMS OTP codes
export const pendingMfaCodes = new Map<string, { code: string, expires: number }>();

// Clean up expired MFA approvals and codes every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of validatedMfaActions.entries()) {
    if (now - val.timestamp > 300000) { // 5 minutes expiry
      validatedMfaActions.delete(key);
    }
  }
  for (const [key, val] of pendingMfaCodes.entries()) {
    if (now > val.expires) {
      pendingMfaCodes.delete(key);
    }
  }
}, 300000);

export interface RequestWithSession extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
    email: string;
  };
  sessionContext?: {
    id: number;
    tokenId: string;
    ipAddress: string;
    deviceFingerprint: string;
  };
}

export async function riskEvaluator(req: RequestWithSession, res: Response, next: NextFunction) {
  // Exclude public auth routes from evaluation
  const path = req.path;
  if (path.startsWith('/api/auth/login') || path.startsWith('/api/auth/register') || path.startsWith('/api/auth/refresh')) {
    return next();
  }

  // Get current authenticated user details from request (injected by JWT middleware)
  const user = req.user;
  const sessionCtx = req.sessionContext;

  if (!user || !sessionCtx) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // 1. Gather Telemetry Features
    const now = new Date();
    const hour_of_day = now.getHours();
    const day = now.getDay();
    const is_weekend = (day === 0 || day === 6) ? 1 : 0;
    
    // Check VPN header
    const vpn_used = req.headers['x-vpn-used'] === 'true' || req.headers['x-vpn-active'] === '1' ? 1 : 0;
    
    // Check location header change
    const location_changed = req.headers['x-location-changed'] === 'true' ? 1 : 0;
    
    // Check device fingerprint
    const deviceFingerprint = (req.headers['x-device-fingerprint'] as string) || sessionCtx.deviceFingerprint;
    const deviceQuery = await db.query(
      'SELECT status FROM devices WHERE user_id = $1 AND device_fingerprint = $2',
      [user.id, deviceFingerprint]
    );
    const device_trusted = deviceQuery.rows.length > 0 && deviceQuery.rows[0].status === 'Trusted' ? 1 : 0;

    // Check failed login attempts (mocked from header or default 0)
    const failed_login_attempts = parseInt(req.headers['x-failed-logins'] as string) || 0;

    // Transaction parameters if transaction endpoint
    let transaction_amount = 0.0;
    if (path.includes('/api/transactions') && req.method === 'POST') {
      transaction_amount = parseFloat(req.body.amount) || 0.0;
    }

    // File download parameters
    let file_downloads_count = 0;
    if (path.includes('/api/analytics/export') || (path.includes('/download') && req.method === 'GET')) {
      file_downloads_count = parseInt(req.query.recordsCount as string) || parseInt(req.body.recordsCount as string) || 10;
    }

    // USB connection flag (triggered specifically via simulation in portals)
    const usb_connected = req.body.usbConnected === true || req.headers['x-usb-connected'] === 'true' ? 1 : 0;

    // Privilege Escalation checking: if employee tries to hit Admin configs, or customer hits Employee portals
    let privilege_escalation_attempt = 0;
    if (path.startsWith('/api/admin') && user.role !== 'Admin') {
      privilege_escalation_attempt = 1;
    }
    if (path.startsWith('/api/employee') && !['Employee', 'BranchManager', 'SecurityAnalyst', 'Admin'].includes(user.role)) {
      privilege_escalation_attempt = 1;
    }

    // Pack into feature vector payload
    const mlPayload = {
      hour_of_day,
      is_weekend,
      location_changed,
      device_trusted,
      failed_login_attempts,
      transaction_amount,
      file_downloads_count,
      usb_connected,
      vpn_used,
      role: user.role,
      privilege_escalation_attempt
    };

    // 2. Fetch Risk Score from Python ML Service
    let riskScore = 10.0;
    let explanation: any = {};
    let decision = 'ALLOW';

    try {
      const response = await fetch(`${ML_SERVICE_URL}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mlPayload),
        signal: AbortSignal.timeout(2000) // 2s timeout
      });

      if (response.ok) {
        const mlResult = await response.json();
        riskScore = mlResult.risk_score;
        decision = mlResult.decision;
        explanation = mlResult.explanation.contributions || {};
      } else {
        throw new Error(`ML Service returned HTTP ${response.status}`);
      }
    } catch (mlErr: any) {
      console.warn(`⚠️ TrustShield RiskEvaluator: ML Service offline (${mlErr.message}). Using local rule-based risk evaluation.`);
      // Local Heuristic Fallback
      riskScore = 10.0;
      explanation = { base_value: 15.0 };

      if (vpn_used) { riskScore += 20; explanation.vpn_used = 20; }
      if (location_changed) { riskScore += 25; explanation.location_changed = 25; }
      if (!device_trusted) { riskScore += 30; explanation.device_trusted = 30; }
      if (failed_login_attempts > 0) { riskScore += failed_login_attempts * 10; explanation.failed_login_attempts = failed_login_attempts * 10; }
      if (transaction_amount > 500000) { riskScore += 40; explanation.transaction_amount = 40; }
      if (file_downloads_count > 1000) { riskScore += 45; explanation.file_downloads_count = 45; }
      if (usb_connected) { riskScore += 55; explanation.usb_connected = 55; }
      if (privilege_escalation_attempt) { riskScore += 50; explanation.privilege_escalation_attempt = 50; }
      if (hour_of_day < 7 || hour_of_day > 21) { riskScore += 15; explanation.hour_of_day = 15; }

      riskScore = Math.min(riskScore, 100);
      decision = riskScore < 40 ? 'ALLOW' : riskScore <= 70 ? 'CHALLENGE_MFA' : 'TERMINATE_AND_LOCK';
    }

    // 3. Log Evaluation Results
    // Save behavior log
    await db.query(
      'INSERT INTO behavior_logs (user_id, session_id, action_type, resource_accessed, details, ip_address, is_anomaly) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [
        user.id,
        sessionCtx.id,
        req.method + ' ' + req.path,
        req.path,
        JSON.stringify({ ...mlPayload, clientIp: sessionCtx.ipAddress }),
        sessionCtx.ipAddress,
        riskScore >= 40
      ]
    );

    // Save risk score history
    await db.query(
      'INSERT INTO risk_scores (user_id, session_id, risk_score, explanation) VALUES ($1, $2, $3, $4)',
      [user.id, sessionCtx.id, Math.round(riskScore), JSON.stringify(explanation)]
    );

    // Update active session score
    await db.query(
      'UPDATE sessions SET current_risk_score = $1 WHERE id = $2',
      [Math.round(riskScore), sessionCtx.id]
    );

    // 4. Enforce Security Policy Decision
    
    // CASE A: High Risk (> 70) - Instant Lockout & Kill Session
    if (decision === 'TERMINATE_AND_LOCK' || riskScore > 70) {
      console.warn(`🚨 Security Policy: Terminating session ${sessionCtx.id} for user ${user.username}. Risk score: ${riskScore}`);
      
      // Terminate session
      await db.query('UPDATE sessions SET status = $1 WHERE id = $2', ['Terminated', sessionCtx.id]);
      
      // Lock user account (admin_system is exempted to avoid lockout during presentation)
      if (user.username !== 'admin_system' && user.role !== 'Admin') {
        await db.query('UPDATE users SET is_locked = $1 WHERE id = $2', [true, user.id]);
      } else {
        console.log(`ℹ️ Security Policy: Lockout bypassed for system administrator ${user.username}.`);
      }
      
      // Create alert
      const alertType = usb_connected ? 'UNAUTHORIZED_USB_CONNECTION' : 
                        privilege_escalation_attempt ? 'PRIVILEGE_ESCALATION_BREACH' : 
                        file_downloads_count > 100 ? 'INSIDER_THREAT_MASS_DOWNLOAD' : 'CRITICAL_RISK_TERMINATION';
      
      const alertDesc = `Automatic lockout triggered. User ${user.username} (IP: ${sessionCtx.ipAddress}, Role: ${user.role}) reached critical risk score of ${Math.round(riskScore)}%. Action: ${req.method} ${req.path}`;
      
      const alertResult = await db.query(
        'INSERT INTO alerts (user_id, session_id, alert_type, severity, description, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [user.id, sessionCtx.id, alertType, 'Critical', alertDesc, 'Active']
      );

      const alertId = alertResult.rows[0].id;

      // Escalate to SOC incident
      await db.query(
        'INSERT INTO incidents (alert_id, assigned_to, status, notes) VALUES ($1, $2, $3, $4)',
        [alertId, null, 'Open', 'System automated isolation executed. Account locked. Awaiting SOC manual triage.']
      );

      return res.status(401).json({
        code: 'SESSION_TERMINATED',
        message: 'Critical security anomaly detected. Session terminated and banking access locked.',
        riskScore
      });
    }

    // CASE B: Moderate Risk (40 - 70) - Adaptive Challenge MFA
    if (decision === 'CHALLENGE_MFA' || (riskScore >= 40 && riskScore <= 70)) {
      // Check if this action hash is already marked as verified by the user in the last 5 minutes
      const actionHash = `${user.id}:${req.method}:${req.path}:${JSON.stringify(req.body)}`;
      const cachedVerification = validatedMfaActions.get(sessionCtx.tokenId);

      if (cachedVerification && cachedVerification.actionHash === actionHash) {
        // MFA validated, allow proceeding
        return next();
      }

      console.log(`⚠️ Security Policy: Raising MFA challenge for user ${user.username}. Risk score: ${riskScore}`);

      // Generate a dynamic 6-digit OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      pendingMfaCodes.set(sessionCtx.tokenId, {
        code: generatedOtp,
        expires: Date.now() + 300000 // 5 minutes
      });

      // Dispatch OTP via SMS API
      await sendSmsOtp(user.username, generatedOtp);
      
      // Raise alert for audit, but don't block permanently yet
      const alertType = transaction_amount > 100000 ? 'RISKY_HIGH_VALUE_TRANSACTION' : 'SUSPICIOUS_SESSION_RISK';
      const alertDesc = `Adaptive Authentication challenge presented to user ${user.username} due to risk score of ${Math.round(riskScore)}% on action ${req.method} ${req.path}`;
      
      await db.query(
        'INSERT INTO alerts (user_id, session_id, alert_type, severity, description, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [user.id, sessionCtx.id, alertType, 'Medium', alertDesc, 'Active']
      );

      return res.status(403).json({
        code: 'MFA_REQUIRED',
        message: 'Additional identity verification required to authorize this action.',
        riskScore,
        explanation
      });
    }

    // CASE C: Safe Session (< 40) - Allow
    next();

  } catch (err: any) {
    console.error('Risk Evaluator Internal Error:', err);
    res.status(500).json({ error: 'Security Risk Evaluator error: ' + err.message });
  }
}
