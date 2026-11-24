# Security Specification — Gallery Username @kerocoo

## 1. Data Invariants
1. **Public Catalog, Admin-Only Mutations**: Every visitor can read (`get` / `list`) `/usernames/{usernameId}`, `/adminCards/{cardId}`, and `/storeConfig/{configId}` without signing in, and none of these public collections contain user PII (only public storefront usernames, prices, Telegram store handles, and order instructions).
2. **Verified Owner / Admin Gate**: Only an authenticated user with `request.auth.token.email_verified == true` who is either the bootstrapped owner (`meicyagsaputri@gmail.com`) or listed in `/admins/{request.auth.uid}` can create, update, or delete `/usernames`, `/adminCards`, or `/storeConfig`.
3. **Immutable Ownership & Creation Timestamps**: `ownerUid` and `createdAt` on `/usernames` and `createdAt` on `/adminCards` cannot be modified after creation, and `createdAt` / `updatedAt` must equal `request.time`.
4. **Strict Payload & Path Hardening**: All document IDs must match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars). Every string has explicit `.size()` bounds, category and status fields are allowlisted enums, `howToOrderSteps` array is bounded (`<= 10`) with element type checks, and no ghost/extra keys are permitted via `hasAll` + `hasOnly`.
5. **PII & RBAC Isolation**: `/admins/{adminUid}` stores admin email/uid mappings and is strictly unreadable by non-admins and non-owners, and only the bootstrapped owner can add/remove delegated admins.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return `PERMISSION_DENIED`)
1. **Unauthenticated Username Create**: Unauthenticated visitor attempts `create` on `/usernames/u1`.
2. **Non-Admin Authenticated Create**: Signed-in non-owner user (`attacker@example.com`) attempts `create` on `/usernames/u2`.
3. **Unverified Email Spoofing**: Signed-in user claiming `email: "meicyagsaputri@gmail.com"` with `email_verified: false` attempts `create` on `/usernames/u3`.
4. **Ghost / Shadow Field Injection**: Admin sends `create` on `/usernames/u4` with an extra field `isFeaturedHack: true`.
5. **Invalid Username Regex**: Admin sends `username: "not_starting_with_at"` or `username: "@bad space!"` on `/usernames/u5`.
6. **Invalid Category Enum**: Admin sends `category: "illegal_category"` on `/usernames/u6`.
7. **Resource Exhaustion (1MB Description)**: Admin sends a 2,000-char `description` exceeding `maxLength: 300`.
8. **Negative Price Poisoning**: Admin sends `price: -50000` on `/usernames/u7`.
9. **Client-Forged Timestamp**: Admin sends `createdAt: Timestamp(2020-01-01)` instead of `serverTimestamp()` (`request.time`).
10. **Immutable Field Mutation**: Admin sends `update` on `/usernames/u1` trying to alter `ownerUid` or `createdAt`.
11. **Path Variable ID Poisoning**: Admin attempts `create` on `/usernames/bad$id..hack` violating `isValidId()`.
12. **Self-Assigned Admin Escalation & PII Read**: Non-admin user attempts `read` or `create` on `/admins/attackerUid`.
