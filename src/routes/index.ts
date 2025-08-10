import { Router } from 'express';
import webhookRoutes from './webhook.routes';

const router = Router();

// Registra todas as rotas
router.use('/webhook', webhookRoutes);

export default router;
