import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const KEYLEN = 64;

export async function hashPassword(password){
  if (String(password || '').length < 10) throw new Error('Password must be at least 10 characters.');
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await scrypt(String(password), salt, KEYLEN, { N: 16384, r: 8, p: 1 });
  return { scheme:'scrypt-v1', salt, hash:Buffer.from(key).toString('hex') };
}

export async function verifyPassword(password, record){
  if (!record?.salt || !record?.hash || record.scheme !== 'scrypt-v1') return false;
  const key = await scrypt(String(password), record.salt, KEYLEN, { N: 16384, r: 8, p: 1 });
  const actual = Buffer.from(key);
  const expected = Buffer.from(record.hash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
