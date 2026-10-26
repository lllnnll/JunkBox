import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
    // Changing this secret makes the stored app secrets unreadable (hosts must redo /setup)
    const secret = process.env.SPOTIFY_SECRETS_KEY || process.env.NEXTAUTH_SECRET;
    if (!secret) {
        throw new Error('SPOTIFY_SECRETS_KEY or NEXTAUTH_SECRET must be set');
    }
    // Accept any string and derive a 32 bytes key from it, distinct from NextAuth's own keys
    return createHash('sha256').update(`junkbox-spotify-secrets:${secret}`).digest();
}

/**
 * Encrypt a string with AES-256-GCM
 * @returns "iv:authTag:ciphertext" in base64
 */
export function encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

    return [iv, cipher.getAuthTag(), encrypted].map((b) => b.toString('base64')).join(':');
}

export function decrypt(payload: string): string {
    const [iv, authTag, encrypted] = payload.split(':').map((part) => Buffer.from(part, 'base64'));
    const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
