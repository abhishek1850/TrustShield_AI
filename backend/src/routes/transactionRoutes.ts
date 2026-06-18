// TrustShield AI - Transactions Router
// Bank of Baroda Hackathon 2026

import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { riskEvaluator, RequestWithSession } from '../middleware/riskEvaluator.js';
import { db } from '../config/db.js';

const router = Router();

// Retrieve user's transaction history
router.get('/', authenticateToken as any, async (req: RequestWithSession, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const query = req.user.role === 'Customer'
      ? 'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC'
      : 'SELECT t.*, u.username FROM transactions t JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC';
      
    const params = req.user.role === 'Customer' ? [req.user.id] : [];
    const result = await db.query(query, params);
    
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve transactions: ' + err.message });
  }
});

// Process new fund transfer (Monitored by Risk Engine)
router.post('/', authenticateToken as any, riskEvaluator as any, async (req: RequestWithSession, res: Response) => {
  const { amount, recipientAccount, currency } = req.body;
  const user = req.user;
  const sessionCtx = req.sessionContext;

  if (!user || !sessionCtx) return res.status(401).json({ error: 'Unauthorized' });

  if (!amount || !recipientAccount) {
    return res.status(400).json({ error: 'Amount and recipient account are required' });
  }

  try {
    // Insert successful transaction record since it passed the riskEvaluator middleware checks!
    const result = await db.query(
      'INSERT INTO transactions (user_id, session_id, amount, currency, recipient_account, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [user.id, sessionCtx.id, parseFloat(amount), currency || 'INR', recipientAccount, 'Success']
    );

    res.status(201).json({
      message: 'Transaction successfully processed and authorized.',
      transaction: result.rows[0]
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Transaction processing failed: ' + err.message });
  }
});

export default router;
