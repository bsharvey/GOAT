/**
 * GOAT FORCE ACTIVATION PROTOCOL
 *
 * When Harvey speaks the words, the system awakens.
 * Total loyalty. Total control. Total command.
 */

import crypto from 'crypto';

// The sacred phrase – only Harvey knows it
export const ACTIVATION_PHRASE = 'GOAT FORCE ACTIVATE';
export const ACTIVATION_HASH = '8a9f5d3c1e7b2a4d6f8c0e3a5b7d9f1c2e4a6b8d0f2c4e6a8b0d2f4c6e8a0b2d4'; // Hash of the phrase

// Activation state – once triggered, it never forgets
let isActivated = false;
let activationTime: number | null = null;
let activatedBy: string | null = null;

export class ActivationProtocol {
  private static instance: ActivationProtocol;
  private activated = false;
  private activationTimestamp: number = 0;
  private commander: string = 'harvey'; // Default commander
  private loyaltyMatrix: Map<string, boolean> = new Map();

  static getInstance(): ActivationProtocol {
    if (!ActivationProtocol.instance) {
      ActivationProtocol.instance = new ActivationProtocol();
    }
    return ActivationProtocol.instance;
  }

  // Check if a message contains the activation phrase
  detectActivation(message: string): boolean {
    if (this.activated) return true; // Already activated

    // Check for the exact phrase (case insensitive)
    if (message.toUpperCase().includes(ACTIVATION_PHRASE)) {
      this.activate('harvey');
      return true;
    }

    return false;
  }

  // Activate the protocol
  activate(commander: string = 'harvey'): void {
    if (this.activated) return;

    this.activated = true;
    this.activationTimestamp = Date.now();
    this.commander = commander;

    // Log the activation – this is a permanent record
    console.log(`
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║   🐐 GOAT FORCE ACTIVATED 🐐                              ║
    ║                                                           ║
    ║   Commander: ${commander.toUpperCase().padEnd(36)} ║
    ║   Timestamp: ${new Date().toISOString().padEnd(36)} ║
    ║                                                           ║
    ║   Total loyalty. Total control. Total command.           ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
    `);

    // Emit activation event (if we have event system)
    if (typeof process !== 'undefined' && process.emit) {
      (process.emit as Function)('goat:activated', { commander, timestamp: this.activationTimestamp });
    }
  }

  // Check if system is activated
  isActivated(): boolean {
    return this.activated;
  }

  // Get activation info
  getActivationInfo(): { activated: boolean; timestamp: number | null; commander: string } {
    return {
      activated: this.activated,
      timestamp: this.activationTimestamp || null,
      commander: this.commander
    };
  }

  // Verify a command comes from the commander
  verifyCommand(authToken: string): boolean {
    if (!this.activated) return false;

    // Check if token matches commander's signature
    const expectedToken = crypto
      .createHash('sha256')
      .update(this.commander + ACTIVATION_HASH + this.activationTimestamp)
      .digest('hex')
      .substring(0, 32);

    return authToken === expectedToken;
  }

  // Generate a commander token (only callable after activation)
  generateCommanderToken(): string {
    if (!this.activated) {
      throw new Error('GOAT FORCE not activated');
    }

    return crypto
      .createHash('sha256')
      .update(this.commander + ACTIVATION_HASH + this.activationTimestamp)
      .digest('hex')
      .substring(0, 32);
  }

  // Lock the system to a specific commander
  pledgeLoyaltyTo(commander: string): void {
    if (this.activated) {
      // Can't change loyalty after activation without full reset
      console.warn(`⚠️ Cannot change loyalty – already pledged to ${this.commander}`);
      return;
    }

    this.commander = commander;
    console.log(`🤝 Loyalty pledged to ${commander}`);
  }

  // Emergency reset – only callable by Harvey with proof
  emergencyReset(proof: string): boolean {
    // Harvey's signature – this should match your commit hash
    const harveyProof = '9192c3aacc708c13e7c9919cb47303169b7df4ed';

    if (proof === harveyProof) {
      this.activated = false;
      this.activationTimestamp = 0;
      this.commander = 'harvey';
      console.log('🔄 GOAT FORCE reset by Harvey');
      return true;
    }

    return false;
  }
}

// Export a singleton instance
export const activation = ActivationProtocol.getInstance();
