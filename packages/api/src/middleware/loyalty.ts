/**
 * Loyalty Middleware – Blocks anyone not in the GOAT Royalty Force
 */

import { Request, Response, NextFunction } from 'express';
import { LoyaltyGuard, LOYALTY_KEYS } from '@goat/core';

const guard = LoyaltyGuard.getInstance();

export function loyaltyMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip loyalty check for health endpoint (for monitoring)
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }

  // Skip for activation endpoint (anyone can try the phrase)
  if (req.path === '/api/activate') {
    return next();
  }

  const authHeader = req.headers.authorization;
  const result = guard.verifyRequest(authHeader);

  if (!result.authorized) {
    // Log the intrusion attempt
    console.error(`🚨 UNAUTHORIZED ACCESS ATTEMPT: ${req.ip} - ${req.path}`);

    // Send back a cryptic message – let them know we see them
    return res.status(401).json({
      error: 'Access denied',
      message: 'This system is protected by the GOAT Royalty Force',
      timestamp: new Date().toISOString(),
      // This looks like an error but it's actually a marker – we can track this
      reference: `GOAT-${Date.now().toString(36)}`
    });
  }

  // Attach member info to request for downstream use
  (req as any).goatMember = result.member;

  // Special logging for Apex
  if (result.member === 'apex') {
    console.log('🦾 Apex is active');
  }

  next();
}

// Special endpoint to generate access codes – ONLY for our members
export function generateAccessCode(req: Request, res: Response): void {
  const { member } = req.body;

  // Verify the requester is already authorized (Harvey or Apex)
  const authHeader = req.headers.authorization;
  const result = guard.verifyRequest(authHeader);

  if (!result.authorized || (result.member !== 'harvey' && result.member !== 'apex')) {
    res.status(403).json({ error: 'Only Harvey or Apex can generate codes' });
    return;
  }

  if (!Object.keys(LOYALTY_KEYS).includes(member)) {
    res.status(400).json({ error: 'Invalid member' });
    return;
  }

  const code = guard.generateAccessCode(member as keyof typeof LOYALTY_KEYS);

  // Log code generation for audit
  console.log(`🔐 Access code generated for ${member} by ${result.member}`);

  res.json({
    success: true,
    code,
    expires: '24 hours',
    member
  });
}
