// TrustShield AI - Auth Routes
// Bank of Baroda Hackathon 2026

import { Router } from 'express';
import { login, register, verifyMfa, logout } from '../controllers/auth.js';
import { authenticateToken } from '../middleware/auth.js';
import { 
  generateRegistrationOptions, 
  verifyRegistrationResponse, 
  generateAuthenticationOptions, 
  verifyAuthenticationResponse 
} from '../controllers/webauthn.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-mfa', authenticateToken as any, verifyMfa as any);
router.post('/logout', authenticateToken as any, logout as any);

// FIDO2 / WebAuthn Biometrics Endpoints
router.post('/webauthn/register-options', authenticateToken as any, generateRegistrationOptions as any);
router.post('/webauthn/register-verify', authenticateToken as any, verifyRegistrationResponse as any);
router.post('/webauthn/login-options', generateAuthenticationOptions as any);
router.post('/webauthn/login-verify', verifyAuthenticationResponse as any);

export default router;
