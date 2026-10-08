/**
 * Firestore Security Rules Test Specification (Dirty Dozen Verification)
 * Verifies that all 12 adversarial payloads in security_spec.md return PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: {
    uid: string;
    email?: string;
    email_verified?: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'ID Poisoning on /letters',
    collectionPath: '/letters/invalid$id!@#',
    operation: 'create',
    auth: { uid: 'user-1', email: 'user@example.com', email_verified: true },
    payload: { id: 'invalid$id!@#', order: 1, title: 'T', content: 'C', published: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow Field Injection on Letter Create',
    collectionPath: '/letters/letter-1',
    operation: 'create',
    auth: { uid: 'user-1', email: 'user@example.com', email_verified: true },
    payload: {
      id: 'letter-1',
      order: 1,
      title: 'Oi',
      content: 'Amor',
      published: true,
      ghostAdmin: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Oversized Content DoW Attack',
    collectionPath: '/letters/letter-2',
    operation: 'create',
    auth: { uid: 'user-1', email: 'user@example.com', email_verified: true },
    payload: {
      id: 'letter-2',
      order: 2,
      title: 'Oi',
      content: 'A'.repeat(50001),
      published: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Type Poisoning on Letter Update',
    collectionPath: '/letters/letter-1',
    operation: 'update',
    auth: { uid: 'user-1', email: 'user@example.com', email_verified: true },
    payload: {
      id: 'letter-1',
      order: 'not-a-number',
      title: 'Oi',
      content: 'Amor',
      published: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Unbounded Array Injection on likedBy',
    collectionPath: '/letters/letter-1',
    operation: 'update',
    auth: { uid: 'user-1', email: 'user@example.com', email_verified: true },
    payload: {
      id: 'letter-1',
      order: 1,
      title: 'Oi',
      content: 'Amor',
      published: true,
      likedBy: [12345],
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'ID Mismatch Spoofing on Letter Create',
    collectionPath: '/letters/letter-1',
    operation: 'create',
    auth: { uid: 'user-1', email: 'user@example.com', email_verified: true },
    payload: {
      id: 'letter-999',
      order: 1,
      title: 'Oi',
      content: 'Amor',
      published: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Arbitrary Config Document Creation',
    collectionPath: '/album_config/rogue-config',
    operation: 'create',
    auth: { uid: 'user-1', email: 'user@example.com', email_verified: true },
    payload: {
      recipientName: 'Meu Amor',
      senderName: 'Leo',
      coverTitle: 'Capa',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Config Shadow Field Injection',
    collectionPath: '/album_config/main',
    operation: 'update',
    auth: { uid: 'user-1', email: 'user@example.com', email_verified: true },
    payload: {
      recipientName: 'Meu Amor',
      senderName: 'Leo',
      coverTitle: 'Capa',
      hacked: 123,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Corrupted Memory Payload - Missing Required photoUrl',
    collectionPath: '/memories/mem-1',
    operation: 'create',
    auth: { uid: 'user-1', email: 'user@example.com', email_verified: true },
    payload: {
      id: 'mem-1',
      date: '2024-01-01',
      title: 'Momento',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Memory Shadow Field on Update',
    collectionPath: '/memories/mem-1',
    operation: 'update',
    auth: { uid: 'user-1', email: 'user@example.com', email_verified: true },
    payload: {
      id: 'mem-1',
      date: '2024-01-01',
      title: 'Momento',
      photoUrl: 'https://example.com/photo.jpg',
      isSuperAdmin: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unverified Email Admin Spoofing',
    collectionPath: '/admins/attacker-uid',
    operation: 'create',
    auth: { uid: 'attacker-uid', email: 'zeeremlk@gmail.com', email_verified: false },
    payload: {
      email: 'zeeremlk@gmail.com',
      role: 'admin',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'PII Blanket Read on Admins by Non-Owner',
    collectionPath: '/admins/admin-1',
    operation: 'get',
    auth: { uid: 'regular-user-2', email: 'other@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];
