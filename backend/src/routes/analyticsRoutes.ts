// TrustShield AI - Security Analytics & Monitoring Router
// Bank of Baroda Hackathon 2026

import { Router, Response } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { RequestWithSession, riskEvaluator } from '../middleware/riskEvaluator.js';
import { db } from '../config/db.js';

const router = Router();

// Retrieve high-level statistics for SOC and Admin Dashboards
router.get(
  '/dashboard-stats',
  authenticateToken as any,
  authorizeRoles('SecurityAnalyst', 'Admin', 'ComplianceOfficer') as any,
  async (req: RequestWithSession, res: Response) => {
    try {
      const alertsCount = await db.query('SELECT COUNT(*) FROM alerts');
      const activeAlertsCount = await db.query('SELECT COUNT(*) FROM alerts WHERE status = \'Active\'');
      const openIncidents = await db.query('SELECT COUNT(*) FROM incidents WHERE status = \'Open\' OR status = \'Investigating\'');
      const activeSessions = await db.query('SELECT COUNT(*) FROM sessions WHERE status = \'Active\'');
      const averageRisk = await db.query('SELECT AVG(current_risk_score) FROM sessions WHERE status = \'Active\'');

      const avgScore = Math.round(parseFloat(averageRisk.rows[0].avg || '0'));
      const threatLevel = avgScore < 20 ? 'Low' : avgScore < 50 ? 'Medium' : 'High';

      res.json({
        totalAlerts: parseInt(alertsCount.rows[0].count),
        activeAlerts: parseInt(activeAlertsCount.rows[0].count),
        openIncidents: parseInt(openIncidents.rows[0].count),
        activeSessions: parseInt(activeSessions.rows[0].count),
        averageRiskScore: avgScore,
        systemThreatLevel: threatLevel
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to compute dashboard metrics: ' + err.message });
    }
  }
);

// Retrieve live active user sessions
router.get(
  '/live-sessions',
  authenticateToken as any,
  authorizeRoles('SecurityAnalyst', 'Admin', 'BranchManager') as any,
  async (req: RequestWithSession, res: Response) => {
    try {
      const result = await db.query(
        `SELECT s.id, s.token, s.ip_address, s.location_city, s.location_country, s.current_risk_score, s.created_at, s.last_activity_at,
                u.username, u.role, d.device_name, d.device_type, d.os
         FROM sessions s 
         JOIN users u ON s.user_id = u.id 
         LEFT JOIN devices d ON s.device_id = d.id
         WHERE s.status = 'Active'
         ORDER BY s.current_risk_score DESC`
      );
      
      // Mask token prefixes for security compliance
      const maskedSessions = result.rows.map((s: any) => ({
        ...s,
        token: s.token.substring(0, 10) + '...'
      }));

      res.json(maskedSessions);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch live sessions: ' + err.message });
    }
  }
);

// Retrieve historical risk evaluations for trend charting
router.get(
  '/historical-risk',
  authenticateToken as any,
  authorizeRoles('SecurityAnalyst', 'Admin', 'ComplianceOfficer') as any,
  async (req: RequestWithSession, res: Response) => {
    try {
      // Return the last 30 risk evaluations with timestamps
      const result = await db.query(
        `SELECT r.id, r.risk_score, r.evaluated_at, u.username, u.role 
         FROM risk_scores r 
         JOIN users u ON r.user_id = u.id 
         ORDER BY r.evaluated_at DESC 
         LIMIT 30`
      );
      res.json(result.rows.reverse()); // Chronological order
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch historical trends: ' + err.message });
    }
  }
);

// Retrieve latest SHAP explanation details for the SOC Waterfall view
router.get(
  '/shap-explanation',
  authenticateToken as any,
  authorizeRoles('SecurityAnalyst', 'Admin') as any,
  async (req: RequestWithSession, res: Response) => {
    try {
      const result = await db.query(
        `SELECT r.*, u.username, u.role, s.ip_address
         FROM risk_scores r 
         JOIN users u ON r.user_id = u.id
         LEFT JOIN sessions s ON r.session_id = s.id
         ORDER BY r.evaluated_at DESC 
         LIMIT 1`
      );
      
      if (result.rows.length === 0) {
        return res.json({ message: 'No SHAP explainability logs generated yet.' });
      }
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch latest SHAP log: ' + err.message });
    }
  }
);

// Simulated high-risk data export endpoint (Triggers risk evaluation via middleware)
router.get(
  '/export',
  authenticateToken as any,
  riskEvaluator as any,
  async (req: RequestWithSession, res: Response) => {
    const recordsCount = parseInt(req.query.recordsCount as string) || 10;
    res.attachment(`customer_records_export_${Date.now()}.csv`);
    
    // Output basic mock CSV string
    let csvData = 'id,name,account_number,balance,kyc_status\n';
    for (let i = 1; i <= Math.min(recordsCount, 100); i++) {
      csvData += `${i},Customer_${i},987654320${i},${(Math.random() * 500000).toFixed(2)},Verified\n`;
    }

    if (recordsCount > 100) {
      csvData += `... [Truncated remaining ${recordsCount - 100} mock records for download display]`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.status(200).send(csvData);
  }
);

export default router;
