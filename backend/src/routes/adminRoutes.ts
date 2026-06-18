// TrustShield AI - Admin Management Router
// Bank of Baroda Hackathon 2026

import { Router, Response } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { RequestWithSession } from '../middleware/riskEvaluator.js';
import { db } from '../config/db.js';

const router = Router();

// Retrieve list of all users in the system
router.get(
  '/users',
  authenticateToken as any,
  authorizeRoles('Admin', 'SecurityAnalyst', 'ComplianceOfficer') as any,
  async (req: RequestWithSession, res: Response) => {
    try {
      const result = await db.query(
        'SELECT id, username, email, role, is_locked, created_at, updated_at FROM users ORDER BY id ASC'
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve users: ' + err.message });
    }
  }
);

// Toggle Lock/Unlock status on a User account
router.put(
  '/users/:id/lock',
  authenticateToken as any,
  authorizeRoles('Admin', 'SecurityAnalyst') as any,
  async (req: RequestWithSession, res: Response) => {
    const { id } = req.params;
    const { isLocked } = req.body;

    if (isLocked === undefined) {
      return res.status(400).json({ error: 'isLocked boolean value is required' });
    }

    try {
      if (isLocked) {
        const checkUser = await db.query('SELECT username FROM users WHERE id = $1', [parseInt(id)]);
        if (checkUser.rows.length > 0 && checkUser.rows[0].username === 'admin_system') {
          return res.status(400).json({ error: 'Core system administrator account admin_system cannot be locked.' });
        }
      }

      const result = await db.query(
        'UPDATE users SET is_locked = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, email, role, is_locked',
        [isLocked, parseInt(id)]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // If locking, terminate any active sessions for this user
      if (isLocked) {
        await db.query(
          'UPDATE sessions SET status = \'Terminated\' WHERE user_id = $1 AND status = \'Active\'',
          [parseInt(id)]
        );
      }

      res.json({ message: `User account successfully ${isLocked ? 'locked' : 'unlocked'}.`, user: result.rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to toggle account lock: ' + err.message });
    }
  }
);

// Retrieve all system behavior audit logs
router.get(
  '/behavior-logs',
  authenticateToken as any,
  authorizeRoles('Admin', 'SecurityAnalyst', 'ComplianceOfficer') as any,
  async (req: RequestWithSession, res: Response) => {
    try {
      const result = await db.query(
        `SELECT b.*, u.username, u.role 
         FROM behavior_logs b 
         LEFT JOIN users u ON b.user_id = u.id 
         ORDER BY b.timestamp DESC 
         LIMIT 100`
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve audit logs: ' + err.message });
    }
  }
);

export default router;
