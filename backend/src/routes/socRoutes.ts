// TrustShield AI - SOC Security Alert & Incident Router
// Bank of Baroda Hackathon 2026

import { Router, Response } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { RequestWithSession } from '../middleware/riskEvaluator.js';
import { db } from '../config/db.js';

const router = Router();

// Retrieve all security alerts
router.get(
  '/alerts',
  authenticateToken as any,
  authorizeRoles('SecurityAnalyst', 'Admin', 'ComplianceOfficer', 'BranchManager') as any,
  async (req: RequestWithSession, res: Response) => {
    try {
      const result = await db.query(
        'SELECT a.*, u.username, u.role, s.ip_address FROM alerts a LEFT JOIN users u ON a.user_id = u.id LEFT JOIN sessions s ON a.session_id = s.id ORDER BY a.created_at DESC'
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve alerts: ' + err.message });
    }
  }
);

// Update Alert Status (Active, Dismissed, Escalated)
router.put(
  '/alerts/:id/status',
  authenticateToken as any,
  authorizeRoles('SecurityAnalyst', 'Admin') as any,
  async (req: RequestWithSession, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    try {
      const result = await db.query(
        'UPDATE alerts SET status = $1 WHERE id = $2 RETURNING *',
        [status, parseInt(id)]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      res.json({ message: 'Alert status updated', alert: result.rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update alert: ' + err.message });
    }
  }
);

// Retrieve all incidents
router.get(
  '/incidents',
  authenticateToken as any,
  authorizeRoles('SecurityAnalyst', 'Admin') as any,
  async (req: RequestWithSession, res: Response) => {
    try {
      const result = await db.query(
        `SELECT i.*, a.alert_type, a.severity, a.description, u.username as user_flagged, s.ip_address, s.location_city, s.location_country
         FROM incidents i 
         JOIN alerts a ON i.alert_id = a.id 
         LEFT JOIN sessions s ON a.session_id = s.id
         LEFT JOIN users u ON a.user_id = u.id
         ORDER BY i.created_at DESC`
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve incidents: ' + err.message });
    }
  }
);

// Update Incident Status & Triage Notes
router.put(
  '/incidents/:id',
  authenticateToken as any,
  authorizeRoles('SecurityAnalyst', 'Admin') as any,
  async (req: RequestWithSession, res: Response) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    const analystId = req.user?.id;

    if (!status || !notes) {
      return res.status(400).json({ error: 'Status and triage notes are required' });
    }

    try {
      const result = await db.query(
        'UPDATE incidents SET status = $1, notes = $2, assigned_to = $3, resolved_at = CASE WHEN $1 = \'Resolved\' THEN CURRENT_TIMESTAMP ELSE resolved_at END WHERE id = $4 RETURNING *',
        [status, notes, analystId, parseInt(id)]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Incident case file not found' });
      }

      res.json({ message: 'Incident triage file successfully updated', incident: result.rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update incident: ' + err.message });
    }
  }
);

export default router;
