import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * JWT token payload
 */
export interface TokenPayload {
  userId: number;
  email: string;
  plan: string;
  roles?: string[];
}

/**
 * Auth token pair
 */
export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

let privateKey: string | null = null;
let publicKey: string | null = null;

/**
 * Load or generate RS256 key pair
 */
function loadKeys(): { privateKey: string; publicKey: string } {
  if (privateKey && publicKey) {
    return { privateKey, publicKey };
  }

  const keysDir = path.join(__dirname, '../../keys');
  const privateKeyPath = path.join(keysDir, 'private.pem');
  const publicKeyPath = path.join(keysDir, 'public.pem');

  // Check if keys exist
  if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    privateKey = fs.readFileSync(privateKeyPath, 'utf-8');
    publicKey = fs.readFileSync(publicKeyPath, 'utf-8');
    console.log('✅ Loaded existing RS256 keys');
  } else {
    // Generate new key pair
    console.log('🔑 Generating new RS256 key pair...');
    const { privateKey: privKey, publicKey: pubKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    // Save keys
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { recursive: true });
    }
    fs.writeFileSync(privateKeyPath, privKey, { mode: 0o600 });
    fs.writeFileSync(publicKeyPath, pubKey, { mode: 0o644 });

    privateKey = privKey;
    publicKey = pubKey;
    console.log('✅ Generated and saved RS256 keys');
  }

  return { privateKey, publicKey };
}

/**
 * Sign JWT with RS256
 */
export function signToken(payload: TokenPayload, expiresIn: string = '15m'): string {
  const { privateKey } = loadKeys();
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: expiresIn,
  } as jwt.SignOptions);
}

/**
 * Verify JWT with RS256
 */
export function verifyToken(token: string): TokenPayload {
  const { publicKey } = loadKeys();
  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
  }) as TokenPayload;
}

/**
 * Generate access token (15 minutes)
 */
export function generateAccessToken(payload: TokenPayload): string {
  return signToken(payload, '15m');
}

/**
 * Generate refresh token (30 days)
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return signToken(payload, '30d');
}

/**
 * Generate token pair
 */
export function generateTokenPair(payload: TokenPayload): AuthTokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}

/**
 * Hash refresh token for storage
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
