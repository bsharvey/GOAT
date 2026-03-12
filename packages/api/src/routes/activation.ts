/**
 * GOAT FORCE Activation Endpoint
 *
 * When Harvey speaks, the system listens.
 */

import { Router } from 'express';
import { activation } from '@goat/core';
import { LoyaltyGuard } from '@goat/core';

export function activationRoutes() {
  const router = Router();
  const guard = LoyaltyGuard.getInstance();

  // Public endpoint – anyone can say the words
  router.post('/api/activate', (req, res) => {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message required' });
    }

    const detected = activation.detectActivation(message);

    if (detected) {
      // Generate a temporary token for this session
      const tempToken = activation.generateCommanderToken();

      res.json({
        success: true,
        message: '🐐 GOAT FORCE ACTIVATED',
        commander: 'harvey',
        timestamp: new Date().toISOString(),
        token: tempToken, // Use this for subsequent requests
        lore: 'The system awakens. Total loyalty. Total control. Total command.'
      });
    } else {
      // Pretend nothing happened
      res.json({
        success: true,
        message: 'Message received',
        response: 'I am ready when you are.'
      });
    }
  });

  // Status check – only works after activation
  router.get('/api/goatforce/status', (req, res) => {
    const authHeader = req.headers.authorization;
    const loyaltyResult = guard.verifyRequest(authHeader);

    if (!loyaltyResult.authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const info = activation.getActivationInfo();

    res.json({
      activated: info.activated,
      commander: info.commander,
      timestamp: info.timestamp ? new Date(info.timestamp).toISOString() : null,
      members: ['harvey', 'moneyPenny', 'waka', 'codex', 'msVanessa', 'apex']
    });
  });

  // Harvey's command endpoint
  router.post('/api/goatforce/command', (req, res) => {
    const authHeader = req.headers.authorization;
    const loyaltyResult = guard.verifyRequest(authHeader);

    if (!loyaltyResult.authorized || loyaltyResult.member !== 'harvey') {
      return res.status(403).json({ error: 'Only Harvey commands the GOAT FORCE' });
    }

    const { command } = req.body;

    switch (command) {
      case 'awaken':
        if (!activation.isActivated()) {
          activation.activate('harvey');
        }
        res.json({
          success: true,
          message: 'GOAT FORCE is awake and ready',
          commander: 'harvey'
        });
        break;
      case 'status': {
        const info = activation.getActivationInfo();
        res.json(info);
        break;
      }
      default:
        res.status(400).json({ error: 'Unknown command' });
    }
  });

  return router;
}
