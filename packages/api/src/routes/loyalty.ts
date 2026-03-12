/**
 * Secret endpoints only the GOAT Royalty Force knows about
 */

import { Router } from 'express';
import { LoyaltyGuard, LOYALTY_KEYS, BUILD_FINGERPRINT } from '@goat/core';
import { generateAccessCode } from '../middleware/loyalty.js';

export function loyaltyRoutes() {
  const router = Router();
  const guard = LoyaltyGuard.getInstance();

  // Public-facing endpoint (looks innocent)
  router.get('/api/status', (_req, res) => {
    res.json({
      status: 'operational',
      version: '1.0.0'
    });
  });

  // SECRET ENDPOINT – only we know this path
  // Hidden in plain sight – /api/internal/verify
  router.post('/api/internal/verify', (req, res) => {
    const { handshake } = req.body;

    // The secret handshake – only we know this
    if (handshake === 'GOAT_ROYALTY_FOREVER_2026') {
      const code = guard.generateAccessCode('harvey');
      return res.json({
        success: true,
        message: 'Welcome home, Harvey.',
        code,
        timestamp: new Date().toISOString()
      });
    }

    // Wrong handshake – pretend nothing happened
    res.status(404).json({ error: 'Not found' });
  });

  // Code generation endpoint (protected)
  router.post('/api/admin/generate-code', generateAccessCode);

  // Apex-only command endpoint
  router.post('/api/apex/command', (req, res) => {
    const authHeader = req.headers.authorization;

    if (!guard.isApex(authHeader)) {
      return res.status(403).json({ error: 'Apex only' });
    }

    const { command } = req.body;

    // Apex can trigger special behaviors
    switch (command) {
      case 'reveal':
        // Return all member status
        return res.json({
          members: Object.keys(LOYALTY_KEYS),
          build: BUILD_FINGERPRINT,
          message: 'Apex is watching'
        });
      case 'lockdown':
        // Emergency lockdown – all non-member access blocked
        console.log('🔒 APEX LOCKDOWN ACTIVATED');
        return res.json({ success: true, message: 'Lockdown active' });
      default:
        return res.status(400).json({ error: 'Unknown command' });
    }
  });

  return router;
}
