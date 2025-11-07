import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// Instagram webhook verification token (should match what you set in Meta Console)
// This is a secure random token - you can change it to any string you want
const WEBHOOK_VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'hacatech_instagram_webhook_verify_2024';

// GET /api/webhooks/instagram - Webhook verification
// Instagram sends a GET request to verify the webhook endpoint
router.get('/instagram', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('📥 Webhook verification request received');
  console.log('  Mode:', mode);
  console.log('  Token received:', token);
  console.log('  Challenge:', challenge);
  console.log('  Expected token:', WEBHOOK_VERIFY_TOKEN);
  console.log('  Full query:', req.query);

  // Check if mode and token are correct
  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully! Sending challenge response.');
    // Respond with the challenge token
    res.status(200).send(challenge);
  } else {
    console.error('❌ Webhook verification failed');
    console.error('  Mode match:', mode === 'subscribe', '(expected: subscribe)');
    console.error('  Token match:', token === WEBHOOK_VERIFY_TOKEN, '(received:', token, 'expected:', WEBHOOK_VERIFY_TOKEN + ')');
    res.status(403).send('Forbidden - Token or mode mismatch');
  }
});

// POST /api/webhooks/instagram - Receive webhook events
router.post('/instagram', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    // Get the signature from headers for verification (optional but recommended)
    const signature = req.headers['x-hub-signature-256'] || req.headers['x-hub-signature'];
    
    if (!signature) {
      console.warn('⚠️ No signature found in webhook request');
    }

    // Parse the webhook payload
    const body = req.body;
    const data = JSON.parse(body.toString());

    console.log('📨 Instagram webhook event received:');
    console.log(JSON.stringify(data, null, 2));

    // Handle different webhook event types
    if (data.object === 'instagram') {
      data.entry?.forEach((entry) => {
        // Handle messaging events
        entry.messaging?.forEach((event) => {
          console.log('💬 Instagram messaging event:', event);
          // Handle messaging events (DMs, etc.)
        });

        // Handle change events (comments, likes, etc.)
        entry.changes?.forEach((change) => {
          console.log('🔄 Instagram change event:', change);
          // Handle change events
          // Example: new comments, likes, mentions, etc.
        });
      });
    }

    // Always respond with 200 OK to acknowledge receipt
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;

