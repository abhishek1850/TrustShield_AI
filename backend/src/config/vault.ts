// TrustShield AI - Vault Secrets Loader Utility
// Bank of Baroda Hackathon 2026

import fs from 'fs';
import path from 'path';

const VAULT_MOUNT_DIR = '/vault/secrets';

/**
 * Dynamically resolves a secret either from Kubernetes Vault sidecar mounts or system environment.
 */
export function getSecret(key: string, defaultValue?: string): string {
  // 1. Try to load from Kubernetes Vault volume mount
  const filePath = path.join(VAULT_MOUNT_DIR, key.toLowerCase());
  if (fs.existsSync(filePath)) {
    try {
      const secretVal = fs.readFileSync(filePath, 'utf8').trim();
      if (secretVal) {
        return secretVal;
      }
    } catch (err) {
      console.warn(`⚠️ Vault Loader: Failed to read secret file at ${filePath}:`, err);
    }
  }

  // 2. Fall back to standard environment variable
  const envVal = process.env[key];
  if (envVal !== undefined) {
    return envVal;
  }

  // 3. Fall back to defaultValue
  if (defaultValue !== undefined) {
    return defaultValue;
  }

  throw new Error(`❌ Production Setup Critical: Secret key "${key}" not found in Vault mount or environment.`);
}

/**
 * Preloads secrets into process.env to ensure third-party libraries can retrieve them automatically.
 */
export function initVaultSecrets() {
  const secrets = ['DATABASE_URL', 'JWT_SECRET', 'ML_SERVICE_URL', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'];

  console.log('🔒 Vault Loader: Initializing dynamic secrets resolver...');
  for (const secret of secrets) {
    try {
      const val = getSecret(secret);
      process.env[secret] = val;
    } catch (err: any) {
      // Don't crash for optional secrets or during development unless fallback DB is off
      const isCritical = ['DATABASE_URL', 'JWT_SECRET', 'ML_SERVICE_URL'].includes(secret) && 
                         (process.env.DISABLE_DB_FALLBACK === 'true' || process.env.NODE_ENV === 'production');
      if (isCritical) {
        console.error(err.message);
        process.exit(1);
      } else {
        console.log(`ℹ️ Vault Loader: Key "${secret}" is not configured (optional fallback active).`);
      }
    }
  }
}
