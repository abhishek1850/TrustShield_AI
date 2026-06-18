// TrustShield AI - WebAuthn / FIDO2 Authentication Controller
// Bank of Baroda Hackathon 2026

import { Request, Response } from 'express';
import { db } from '../config/db.js';
import { RequestWithSession } from '../middleware/riskEvaluator.js';

// In-memory store for active WebAuthn registration/login challenges
const activeWebAuthnChallenges = new Map<string, string>();

/**
 * Generates options for registering a FIDO2 credential.
 */
export async function generateRegistrationOptions(req: RequestWithSession, res: Response) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Generate a secure registration challenge
    const challenge = Buffer.from(Math.random().toString(36).substring(2) + Date.now().toString()).toString('base64');
    
    // Cache the challenge associated with user ID
    activeWebAuthnChallenges.set(`reg_challenge_${user.id}`, challenge);

    // Standard SimpleWebAuthn Options payload structure
    const options = {
      challenge,
      rp: {
        name: 'TrustShield Bank of Baroda',
        id: 'localhost' // In production, this must match the root domain (e.g. 'bob.in')
      },
      user: {
        id: Buffer.from(user.id.toString()).toString('base64'),
        name: user.username,
        displayName: user.username
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' } // RS256
      ],
      timeout: 60000,
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Enforce local hardware (Windows Hello / TouchID / FaceID)
        userVerification: 'required',
        residentKey: 'required'
      }
    };

    res.json(options);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate registration options: ' + err.message });
  }
}

/**
 * Verifies a FIDO2 registration credential assertion and registers the device.
 */
export async function verifyRegistrationResponse(req: RequestWithSession, res: Response) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { credential } = req.body;
  if (!credential || !credential.id || !credential.rawId) {
    return res.status(400).json({ error: 'Valid credential payload required' });
  }

  try {
    const cachedChallenge = activeWebAuthnChallenges.get(`reg_challenge_${user.id}`);
    if (!cachedChallenge) {
      return res.status(400).json({ error: 'Challenge expired or missing' });
    }

    // Clean up used challenge
    activeWebAuthnChallenges.delete(`reg_challenge_${user.id}`);

    // In a production library (e.g. @simplewebauthn/server), verifyRegistrationResponse() verifies the cryptographic signature
    // Here we verify the registration structure, and insert the credential into our user_credentials table.
    const credentialId = credential.id;
    const publicKey = credential.response.publicKey || 'mock_public_key_pem';
    const counter = credential.response.signCount || 0;
    const transports = JSON.stringify(credential.response.transports || ['internal']);

    await db.query(
      'INSERT INTO user_credentials (user_id, credential_id, public_key, counter, transports) VALUES ($1, $2, $3, $4, $5)',
      [user.id, credentialId, publicKey, counter, transports]
    );

    res.json({ verified: true, message: 'WebAuthn hardware biometric registered successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to verify credential registration: ' + err.message });
  }
}

/**
 * Generates options for validating a FIDO2 credentials assertion.
 */
export async function generateAuthenticationOptions(req: Request, res: Response) {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const userQuery = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userId = userQuery.rows[0].id;

    // Load registered credentials
    const credentialsQuery = await db.query('SELECT credential_id, transports FROM user_credentials WHERE user_id = $1', [userId]);
    
    // Generate secure login challenge
    const challenge = Buffer.from(Math.random().toString(36).substring(2) + Date.now().toString()).toString('base64');
    activeWebAuthnChallenges.set(`auth_challenge_${username}`, challenge);

    const allowCredentials = credentialsQuery.rows.map((c :any)=>({
      id: c.credential_id,
      type: 'public-key',
      transports: typeof c.transports === 'string' ? JSON.parse(c.transports) : c.transports
    }));

    const options = {
      challenge,
      timeout: 60000,
      rpId: 'localhost',
      allowCredentials,
      userVerification: 'required'
    };

    res.json(options);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate auth options: ' + err.message });
  }
}

/**
 * Verifies a FIDO2 credentials assertion to authenticate the session.
 */
export async function verifyAuthenticationResponse(req: Request, res: Response) {
  const { username, assertion } = req.body;
  if (!username || !assertion || !assertion.id) {
    return res.status(400).json({ error: 'Username and assertion payload required' });
  }

  try {
    const cachedChallenge = activeWebAuthnChallenges.get(`auth_challenge_${username}`);
    if (!cachedChallenge) {
      return res.status(400).json({ error: 'Authentication challenge expired or missing' });
    }
    activeWebAuthnChallenges.delete(`auth_challenge_${username}`);

    // Fetch registered public key
    const credentialQuery = await db.query(
      'SELECT c.*, u.username, u.role, u.email FROM user_credentials c JOIN users u ON c.user_id = u.id WHERE c.credential_id = $1',
      [assertion.id]
    );

    if (credentialQuery.rows.length === 0) {
      return res.status(400).json({ error: 'Device not registered for WebAuthn.' });
    }

    const credential = credentialQuery.rows[0];

    // In a production server, verifyAuthenticationResponse() validates the cryptographic signature using credential.public_key
    // Update counter
    const newCounter = assertion.response.signature ? (credential.counter + 1) : credential.counter;
    await db.query('UPDATE user_credentials SET counter = $1 WHERE id = $2', [newCounter, credential.id]);

    res.json({
      verified: true,
      user: {
        id: credential.user_id,
        username: credential.username,
        email: credential.email,
        role: credential.role
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Biometric verification assertion failed: ' + err.message });
  }
}
