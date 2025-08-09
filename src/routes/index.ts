import { Router } from 'express';
import webhookRoutes from './webhook.routes';
import testRoutes from './test.routes';

const router = Router();

// Registra todas as rotas
router.use('/webhook', webhookRoutes);
router.use('/test', testRoutes);

export default router;
