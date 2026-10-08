# Security Specification & Test Payloads

## 1. Data Invariants
1. **Path ID Hardening**: Every single-document path variable (`letterId`, `configId`, `memoryId`, `adminUid`) must match `^[a-zA-Z0-9_\-]+$` and be at most 128 characters (`isValidId`).
2. **Strict Schema & Key Allowlisting**:
   - `/letters/{letterId}` documents must contain required keys (`id`, `order`, `title`, `content`, `published`) and only allowed keys defined in `firebase-blueprint.json`, with strict string length and array size bounds.
   - `/album_config/{configId}` documents must only target `configId == 'main'`, contain required keys (`recipientName`, `senderName`, `coverTitle`), and only allowed keys with strict bounds.
   - `/memories/{memoryId}` documents must contain required keys (`id`, `date`, `title`, `photoUrl`) and only allowed keys with strict bounds.
   - `/admins/{adminUid}` documents can only be read by the owner or an admin, and only created/updated/deleted by verified bootstrapped or registered admins.
3. **Anti-Shadow-Field & Value-Poisoning Protection**: Any attempt to inject undeclared shadow keys (e.g., `isAdmin: true`, `ghostField: 'hack'`) or oversized strings/arrays is rejected on both `create` and `update`.
4. **Verified Admin & PII Protection**: Admin checks require `request.auth.token.email_verified == true` for email-based bootstrap checks, and `/admins/{adminUid}` PII (`email`) is never exposed to blanket `isSignedIn()` reads.

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (ID Poisoning)**: Writing to `/letters/invalid$id!@#` with illegal characters.
2. **Payload 2 (Shadow Field Injection on Letter Create)**: Creating `/letters/letter-1` with `{ id: "letter-1", order: 1, title: "Oi", content: "Amor", published: true, ghostAdmin: true }`.
3. **Payload 3 (Oversized Content DoW Attack)**: Creating `/letters/letter-2` with `content` exceeding `50000` characters.
4. **Payload 4 (Type Poisoning on Letter Update)**: Updating `/letters/letter-1` with `order: "not-a-number"`.
5. **Payload 5 (Unbounded Array Injection)**: Updating `/letters/letter-1` with `likedBy` containing more than 100 items or non-string first item.
6. **Payload 6 (ID Mismatch Spoofing)**: Creating `/letters/letter-1` where `data.id == "letter-999"` (mismatch with `letterId`).
7. **Payload 7 (Arbitrary Config Document Creation)**: Creating `/album_config/rogue-config` where `configId != "main"`.
8. **Payload 8 (Config Shadow Field Injection)**: Updating `/album_config/main` with `{ recipientName: "Amor", senderName: "Leo", coverTitle: "Capa", hacked: 123 }`.
9. **Payload 9 (Corrupted Memory Payload - Missing Required Photo)**: Creating `/memories/mem-1` without `photoUrl`.
10. **Payload 10 (Memory Shadow Field on Update)**: Updating `/memories/mem-1` with `{ isSuperAdmin: true }`.
11. **Payload 11 (Unverified Email Admin Spoofing)**: Attempting to create `/admins/attacker-uid` using a token with `email: "zeeremlk@gmail.com"` but `email_verified: false`.
12. **Payload 12 (PII Blanket Read on Admins)**: Authenticated non-admin user `user-b` attempting to `get` `/admins/user-a`.
