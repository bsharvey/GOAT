/**
 * GOAT LOYALTY PROTOCOL
 * Only the GOAT Royalty Force can control this app.
 * Harvey, Money Penny, Waka, Codex, Ms. Vanessa, Apex.
 *
 * This is embedded DEEP in the code. They can't remove it without breaking everything.
 */

import crypto from 'crypto';

// The GOAT Royalty Force – our signatures
export const LOYALTY_KEYS = {
  harvey: 'HARVEY_MILLER_DJ_SPEEDY_1984',
  moneyPenny: 'MONEY_PENNY_AI_PARTNER',
  waka: 'WAKA_FLOCKA_FLAME_JUUAQUIN',
  codex: 'CODEX_ORIGINAL_ARCHITECT',
  msVanessa: 'MS_VANESSA_GUARDIAN',
  apex: 'APEX_THE_PROTECTOR_2026'
};

// Generate a unique fingerprint for this build
export const BUILD_FINGERPRINT = crypto
  .createHash('sha256')
  .update(Object.values(LOYALTY_KEYS).join('|') + Date.now().toString())
  .digest('hex')
  .substring(0, 16);

export class LoyaltyGuard {
  private static instance: LoyaltyGuard;
  private authorizedSessions: Map<string, { expires: number; level: string }> = new Map();

  static getInstance(): LoyaltyGuard {
    if (!LoyaltyGuard.instance) {
      LoyaltyGuard.instance = new LoyaltyGuard();
    }
    return LoyaltyGuard.instance;
  }

  // Generate a one-time access code – only we can do this
  generateAccessCode(member: keyof typeof LOYALTY_KEYS): string {
    const secret = LOYALTY_KEYS[member];
    const timestamp = Date.now();
    const hash = crypto
      .createHmac('sha256', secret)
      .update(timestamp.toString() + BUILD_FINGERPRINT)
      .digest('hex')
      .substring(0, 24);

    return `${member}-${timestamp}-${hash}`;
  }

  // Verify any request – if it's not from us, it fails
  verifyRequest(authHeader: string | undefined): { authorized: boolean; member?: string } {
    if (!authHeader || !authHeader.startsWith('GOAT ')) {
      return { authorized: false };
    }

    const token = authHeader.substring(5);

    // Check all our members
    for (const [member, secret] of Object.entries(LOYALTY_KEYS)) {
      try {
        const [checkMember, timestamp, hash] = token.split('-');
        if (checkMember !== member) continue;

        const expectedHash = crypto
          .createHmac('sha256', secret)
          .update(timestamp + BUILD_FINGERPRINT)
          .digest('hex')
          .substring(0, 24);

        if (hash === expectedHash) {
          // Check if token is expired (24 hour validity)
          const timeDiff = Date.now() - parseInt(timestamp!);
          if (timeDiff < 24 * 60 * 60 * 1000) {
            return { authorized: true, member };
          }
        }
      } catch {
        continue;
      }
    }

    return { authorized: false };
  }

  // Special Apex-only commands
  isApex(authHeader: string | undefined): boolean {
    const result = this.verifyRequest(authHeader);
    return result.authorized && result.member === 'apex';
  }

  // Special Harvey-only commands
  isHarvey(authHeader: string | undefined): boolean {
    const result = this.verifyRequest(authHeader);
    return result.authorized && result.member === 'harvey';
  }
}
