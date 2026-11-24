/**
 * Security Rule Verification Suite — Gallery Username @kerocoo
 * Covers the Dirty Dozen attack payloads against firestore.rules.
 */
import { readFileSync } from 'node:fs';

export const DIRTY_DOZEN_CASES = [
  { name: '1. Unauthenticated Username Create', path: '/usernames/u1', op: 'create', auth: null, expect: 'PERMISSION_DENIED' },
  { name: '2. Non-Admin Authenticated Create', path: '/usernames/u2', op: 'create', auth: { uid: 'u2', email: 'attacker@example.com', email_verified: true }, expect: 'PERMISSION_DENIED' },
  { name: '3. Unverified Email Spoofing', path: '/usernames/u3', op: 'create', auth: { uid: 'u3', email: 'meicyagsaputri@gmail.com', email_verified: false }, expect: 'PERMISSION_DENIED' },
  { name: '4. Ghost / Shadow Field Injection', path: '/usernames/u4', op: 'create', payload: { isFeaturedHack: true }, expect: 'PERMISSION_DENIED' },
  { name: '5. Invalid Username Regex', path: '/usernames/u5', op: 'create', payload: { username: 'bad_handle_no_at' }, expect: 'PERMISSION_DENIED' },
  { name: '6. Invalid Category Enum', path: '/usernames/u6', op: 'create', payload: { category: 'illegal_category' }, expect: 'PERMISSION_DENIED' },
  { name: '7. Resource Exhaustion Description > 300', path: '/usernames/u7', op: 'create', payload: { description: 'x'.repeat(2000) }, expect: 'PERMISSION_DENIED' },
  { name: '8. Negative Price Poisoning', path: '/usernames/u8', op: 'create', payload: { price: -50000 }, expect: 'PERMISSION_DENIED' },
  { name: '9. Client-Forged Timestamp', path: '/usernames/u9', op: 'create', payload: { createdAt: '2020-01-01T00:00:00Z' }, expect: 'PERMISSION_DENIED' },
  { name: '10. Immutable ownerUid Mutation', path: '/usernames/u1', op: 'update', payload: { ownerUid: 'hijacked_uid' }, expect: 'PERMISSION_DENIED' },
  { name: '11. Path Variable ID Poisoning', path: '/usernames/bad$id', op: 'create', expect: 'PERMISSION_DENIED' },
  { name: '12. Self-Assigned Admin Escalation', path: '/admins/attackerUid', op: 'create', auth: { uid: 'attackerUid', email: 'attacker@example.com', email_verified: true }, expect: 'PERMISSION_DENIED' },
] as const;

export function verifyRulesStructure() {
  const rules = readFileSync('firestore.rules', 'utf8');
  const requiredChecks = [
    "rules_version = '2';",
    'allow read, write: if false;',
    'isValidId(',
    'isValidUsernameItem(',
    'isValidAdminCard(',
    'isValidStoreConfig(',
    'request.auth.token.email_verified == true',
    'incoming().diff(existing()).affectedKeys().hasOnly',
  ];
  for (const check of requiredChecks) {
    if (!rules.includes(check)) {
      throw new Error(`Missing required security invariant in firestore.rules: ${check}`);
    }
  }
  return true;
}
