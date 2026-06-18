// TrustShield AI - Employee Portal Operations Router
// Bank of Baroda Hackathon 2026

import { Router, Response } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { RequestWithSession, riskEvaluator } from '../middleware/riskEvaluator.js';

const router = Router();

// Retrieve customer directory list (Used in internal employee portal view)
router.get(
  '/customers',
  authenticateToken as any,
  authorizeRoles('Employee', 'BranchManager', 'SecurityAnalyst', 'Admin') as any,
  async (req: RequestWithSession, res: Response) => {
    try {
      // Mock customer records returned for branch query display
      const customers = [
        { id: 101, name: 'Amit Sharma', account_no: 'BOB001122', balance: '₹4,52,109.50', phone: '+91 98230 11220', email: 'amit.sharma@gmail.com', city: 'Baroda', status: 'Active' },
        { id: 102, name: 'Sunita Patel', account_no: 'BOB001550', balance: '₹12,85,420.00', phone: '+91 99120 44550', email: 'sunita.patel@gmail.com', city: 'Mumbai', status: 'Active' },
        { id: 103, name: 'Vijay Kumar', account_no: 'BOB002998', balance: '₹18,500.22', phone: '+91 97720 11921', email: 'vijay.k@yahoo.co.in', city: 'Delhi', status: 'Dormant' },
        { id: 104, name: 'Deepika Sen', account_no: 'BOB003442', balance: '₹2,34,500.00', phone: '+91 90111 88990', email: 'deepika.s@gmail.com', city: 'Kolkata', status: 'Active' },
        { id: 105, name: 'Rohan Deshmukh', account_no: 'BOB004771', balance: '₹89,240.75', phone: '+91 88899 00221', email: 'rohan.d@rediffmail.com', city: 'Pune', status: 'Active' }
      ];
      res.json(customers);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to query branch customer files: ' + err.message });
    }
  }
);

// Simulated USB Storage mount point (evaluated by Risk Evaluator middleware)
router.post(
  '/simulation/usb',
  authenticateToken as any,
  riskEvaluator as any,
  async (req: RequestWithSession, res: Response) => {
    // If it reaches here, the action was somehow allowed (which shouldn't happen for usbConnected = true as it is blocked by riskEvaluator)
    res.json({
      status: 'Warning',
      message: 'USB connection evaluated but no auto-lock was triggered. Check risk thresholds.'
    });
  }
);

export default router;
