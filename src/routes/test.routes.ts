import { Router } from 'express';
import RedisClient from '../utils/redis';

const router = Router();

/**
 * GET /test/redis
 * Endpoint para testar a conexão Redis
 */
router.get('/redis', async (req, res) => {
  try {
    const redis = await RedisClient.getInstance();
    await redis.set('test', 'Hello from Aleen IA');
    const result = await redis.get('test');
    
    res.json({
      success: true,
      message: 'Redis connection successful',
      testResult: result,
      connected: RedisClient.isConnected()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
