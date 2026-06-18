// TrustShield AI - Authentication & RBAC Middleware
// Bank of Baroda Hackathon 2026

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
import { RequestWithSession } from './riskEvaluator.js';

const JWT_SECRET = process.env.JWT_SECRET || 'trustshield_jwt_anchor_key_2026';

export async function authenticateToken(req: RequestWithSession, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if session is active in database
    const sessionQuery = await db.query(
      'SELECT s.*, u.username, u.email, u.role, u.is_locked FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = $1',
      [token]
    );

    if (sessionQuery.rows.length === 0) {
      return res.status(401).json({ error: 'Session invalid or logged out' });
    }

    const session = sessionQuery.rows[0];

    if (session.is_locked) {
      return res.status(401).json({ error: 'User account is locked. Contact security operations.' });
    }

    if (session.status !== 'Active') {
      return res.status(401).json({ error: `Session status is ${session.status}` });
    }

    // Attach user information to request
    req.user = {
      id: session.user_id,
      username: session.username,
      role: session.role,
      email: session.email
    };

    // Attach session metadata
    req.sessionContext = {
      id: session.id,
      tokenId: token,
      ipAddress: session.ip_address,
      deviceFingerprint: session.device_fingerprint || ''
    };

    next();

  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
}

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: RequestWithSession, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access Denied: Insufficient permissions for this role' });
    }

    next();
  };
}
