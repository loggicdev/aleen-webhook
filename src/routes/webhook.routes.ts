import { Router } from 'express';
import { WebhookController } from '../controllers';
import { validateWebhook, validateApiKey } from '../middlewares';

const router = Router();
const webhookController = new WebhookController();

/**
 * POST /webhook/evolution
 * Endpoint principal para receber webhooks da Evolution API
 */
router.post(
  '/evolution',
  validateWebhook,
  webhookController.handleWebhook.bind(webhookController)
);

/**
 * GET /webhook/health
 * Health check endpoint
 */
router.get('/health', webhookController.healthCheck.bind(webhookController));

/**
 * GET /webhook/test
 * Endpoint para teste
 */
router.get('/test', webhookController.test.bind(webhookController));

export default router;
