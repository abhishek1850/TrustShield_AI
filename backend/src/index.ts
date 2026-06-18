import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { initVaultSecrets } from './config/vault.js';

// Import routers
import authRouter from './routes/authRoutes.js';
import transactionRouter from './routes/transactionRoutes.js';
import socRouter from './routes/socRoutes.js';
import analyticsRouter from './routes/analyticsRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import employeeRouter from './routes/employeeRoutes.js';

dotenv.config();
initVaultSecrets();

const app = express();
const PORT = process.env.PORT || 5000;

// Security and Policy configuration
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowed = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : ['http://localhost:3000', 'https://trustshield.bob.in', 'https://trustshieldai.vercel.app'];
    
    if (!origin || allowed.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy: domain unauthorized.'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-device-fingerprint', 'x-device-name', 'x-device-type', 'x-os-name', 'x-browser-name', 'x-client-ip', 'x-client-city', 'x-client-country', 'x-vpn-used', 'x-vpn-active', 'x-location-changed', 'x-failed-logins']
}));

app.use(express.json());

// Apply rate limiting (mitigates brute-force and DDoS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // limit each IP to 2000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this client. Please try again after 15 minutes.' }
});
app.use('/api/', limiter);

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/soc', socRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/employee', employeeRouter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    service: 'TrustShield AI Backend Core',
    version: '1.0.0'
  });
});

// Centralized error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Application Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start the server (HTTPS with TLS 1.3, falling back to HTTP if certificates are missing)
import https from 'https';
import fs from 'fs';
import path from 'path';

const sslKeyPath = process.env.SSL_KEY_PATH || '/etc/ssl/trustshield/server.key';
const sslCertPath = process.env.SSL_CERT_PATH || '/etc/ssl/trustshield/server.crt';

if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
  try {
    const options = {
      key: fs.readFileSync(sslKeyPath),
      cert: fs.readFileSync(sslCertPath),
      secureProtocol: 'TLSv1_3_method' // Enforce TLS 1.3
    };

    https.createServer(options, app).listen(PORT, () => {
      console.log(`🛡️ TrustShield Backend: Core API server running securely on HTTPS port ${PORT} (TLS 1.3 Enforced)`);
    });
  } catch (err) {
    console.error('❌ TrustShield SSL Error: Failed to start HTTPS server, falling back to HTTP: ', err);
    app.listen(PORT, () => {
      console.log(`🛡️ TrustShield Backend: Core API server running on HTTP port ${PORT} (SSL Fallback)`);
    });
  }
} else {
  app.listen(PORT, () => {
    console.log(`🛡️ TrustShield Backend: Core API server running on HTTP port ${PORT}`);
  });
}
