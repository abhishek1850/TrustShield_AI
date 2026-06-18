// TrustShield AI - Authentication & Adaptive MFA Controller
// Bank of Baroda Hackathon 2026

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/db.js';
import { RequestWithSession, validatedMfaActions, pendingMfaCodes } from '../middleware/riskEvaluator.js';

const JWT_SECRET = process.env.JWT_SECRET || 'trustshield_jwt_anchor_key_2026';

export async function register(req: Request, res: Response) {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields username, email, password, and role are required.' });
  }

  try {
    // Check if user already exists
    const checkUser = await db.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userResult = await db.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
      [username, email, passwordHash, role]
    );

    const newUser = userResult.rows[0];
    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (err: any) {
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
}

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;
  
  // Device & Geo Headers from Client
  const deviceFingerprint = (req.headers['x-device-fingerprint'] as string) || 'unknown_fp_' + Math.floor(Math.random()*1000);
  const deviceName = (req.headers['x-device-name'] as string) || 'Web Browser';
  const deviceType = (req.headers['x-device-type'] as string) || 'Laptop';
  const osName = (req.headers['x-os-name'] as string) || 'Windows 11';
  const browserName = (req.headers['x-browser-name'] as string) || 'Chrome';
  
  const ipAddress = (req.headers['x-client-ip'] as string) || req.ip || '127.0.0.1';
  const city = (req.headers['x-client-city'] as string) || 'Mumbai';
  const country = (req.headers['x-client-country'] as string) || 'India';

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const userResult = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = userResult.rows[0];

    if (user.is_locked) {
      return res.status(403).json({ error: 'Account locked due to anomalous activities. Contact SOC administrator.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      // Log login failure
      await db.query(
        'INSERT INTO behavior_logs (user_id, action_type, resource_accessed, details, ip_address, is_anomaly) VALUES ($1, $2, $3, $4, $5, $6)',
        [user.id, 'FAILED_LOGIN', 'Auth Portal', JSON.stringify({ deviceFingerprint }), ipAddress, true]
      );
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check device trust status
    let deviceId: number;
    const deviceQuery = await db.query(
      'SELECT id, status FROM devices WHERE user_id = $1 AND device_fingerprint = $2',
      [user.id, deviceFingerprint]
    );

    if (deviceQuery.rows.length === 0) {
      // Register new device
      // If user has NO devices, auto-trust the first device. Otherwise mark as Pending.
      const userDevicesCount = await db.query('SELECT COUNT(*) FROM devices WHERE user_id = $1', [user.id]);
      const isFirstDevice = parseInt(userDevicesCount.rows[0].count) === 0;
      const initialStatus = isFirstDevice ? 'Trusted' : 'Pending';

      const registerDeviceResult = await db.query(
        'INSERT INTO devices (user_id, device_fingerprint, device_name, device_type, os, browser, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [user.id, deviceFingerprint, deviceName, deviceType, osName, browserName, initialStatus]
      );
      deviceId = registerDeviceResult.rows[0].id;
    } else {
      deviceId = deviceQuery.rows[0].id;
      // Update device last active timestamp
      await db.query('UPDATE devices SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1', [deviceId]);
    }

    // Generate JWT access token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Create session in DB
    const sessionResult = await db.query(
      'INSERT INTO sessions (user_id, device_id, token, ip_address, location_city, location_country, current_risk_score, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [user.id, deviceId, token, ipAddress, city, country, 0, 'Active']
    );

    // Log successful behavior
    await db.query(
      'INSERT INTO behavior_logs (user_id, session_id, action_type, resource_accessed, details, ip_address, is_anomaly) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [user.id, sessionResult.rows[0].id, 'LOGIN', 'Auth Portal', JSON.stringify({ deviceFingerprint }), ipAddress, false]
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (err: any) {
    res.status(500).json({ error: 'Login execution failed: ' + err.message });
  }
}

export async function verifyMfa(req: RequestWithSession, res: Response) {
  const { code, faceVerified, pendingAction } = req.body;
  const user = req.user;
  const sessionCtx = req.sessionContext;

  if (!user || !sessionCtx) {
    return res.status(401).json({ error: 'Authentication credentials not found' });
  }

  try {
    // Real OTP verification checking against the active cache map
    const activeCodeRecord = pendingMfaCodes.get(sessionCtx.tokenId);
    const isOtpValid = activeCodeRecord && activeCodeRecord.code === code && Date.now() < activeCodeRecord.expires;

    // Clean up OTP code immediately on successful validation to prevent replay attacks
    if (isOtpValid) {
      pendingMfaCodes.delete(sessionCtx.tokenId);
    }

    const isFaceValid = faceVerified === true;

    if (!isOtpValid && !isFaceValid) {
      // Log failed MFA attempt
      await db.query(
        'INSERT INTO behavior_logs (user_id, session_id, action_type, resource_accessed, details, ip_address, is_anomaly) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [user.id, sessionCtx.id, 'MFA_FAILED', 'Adaptive Auth Gateway', JSON.stringify({ code, faceVerified }), sessionCtx.ipAddress, true]
      );
      return res.status(400).json({ error: 'MFA Verification failed. Incorrect code or facial mismatch.' });
    }

    // Register dynamic action as validated for the next request
    if (pendingAction) {
      const actionHash = `${user.id}:${pendingAction.method}:${pendingAction.path}:${JSON.stringify(pendingAction.body)}`;
      validatedMfaActions.set(sessionCtx.tokenId, {
        timestamp: Date.now(),
        actionHash
      });
    }

    // Audit Log success
    await db.query(
      'INSERT INTO behavior_logs (user_id, session_id, action_type, resource_accessed, details, ip_address, is_anomaly) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [user.id, sessionCtx.id, 'MFA_VERIFIED', 'Adaptive Auth Gateway', JSON.stringify({ verifiedMethod: isFaceValid ? 'BIOMETRIC_FACE' : 'SMS_OTP' }), sessionCtx.ipAddress, false]
    );

    // Reset risk score back to baseline safety (10) because user identity has been verified
    await db.query(
      'UPDATE sessions SET current_risk_score = 10 WHERE id = $1',
      [sessionCtx.id]
    );

    // Log the risk score reset event
    await db.query(
      'INSERT INTO risk_scores (user_id, session_id, risk_score, explanation) VALUES ($1, $2, $3, $4)',
      [user.id, sessionCtx.id, 10, JSON.stringify({ mfa_validation_success: -60, baseline_restore: 10 })]
    );

    res.json({ message: 'Identity verified. Action authorized.', riskScore: 10 });

  } catch (err: any) {
    res.status(500).json({ error: 'MFA verification failed: ' + err.message });
  }
}

export async function logout(req: RequestWithSession, res: Response) {
  const sessionCtx = req.sessionContext;

  if (!sessionCtx) {
    return res.status(401).json({ error: 'No active session found' });
  }

  try {
    // Mark session terminated
    await db.query('UPDATE sessions SET status = $1 WHERE id = $2', ['Terminated', sessionCtx.id]);
    
    // Log behavior
    if (req.user) {
      await db.query(
        'INSERT INTO behavior_logs (user_id, session_id, action_type, resource_accessed, details, ip_address, is_anomaly) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [req.user.id, sessionCtx.id, 'LOGOUT', 'Auth Portal', null, sessionCtx.ipAddress, false]
      );
    }
    
    res.json({ message: 'Session logged out and terminated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Logout failed: ' + err.message });
  }
}
