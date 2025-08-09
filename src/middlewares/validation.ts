import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils';

/**
 * Schema de validação para o webhook da Evolution API
 */
const evolutionWebhookSchema = Joi.object({
  body: Joi.object({
    event: Joi.string().required(),
    instance: Joi.string().required(),
    data: Joi.object({
      key: Joi.object({
        remoteJid: Joi.string().required(),
        fromMe: Joi.boolean().required(),
        id: Joi.string().required()
      }).required(),
      pushName: Joi.string().required(),
      message: Joi.object().required(),
      messageType: Joi.string().required(),
      messageTimestamp: Joi.number().required(),
      instanceId: Joi.string().required(),
      source: Joi.string().valid('ios', 'android', 'web').required()
    }).required(),
    destination: Joi.string().uri().optional(),
    date_time: Joi.string().isoDate().optional(),
    sender: Joi.string().optional(),
    server_url: Joi.string().uri().optional(),
    apikey: Joi.string().required()
  }).required(),
  webhookUrl: Joi.string().uri().optional(),
  executionMode: Joi.string().valid('production', 'development').optional()
});

/**
 * Middleware para validar payload do webhook
 */
export function validateWebhook(req: Request, res: Response, next: NextFunction): void {
  const { error, value } = evolutionWebhookSchema.validate(req.body);
  
  if (error) {
    logger.error('Webhook validation failed', {
      error: error.details,
      body: req.body,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(400).json({
      success: false,
      error: 'Invalid webhook payload',
      details: error.details.map(detail => detail.message)
    });
    return;
  }
  
  // Substitui o body pelo valor validado e sanitizado
  req.body = value;
  next();
}

/**
 * Middleware para validar API key
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.body?.body?.apikey || req.headers['x-api-key'];
  const expectedApiKey = process.env.EVOLUTION_API_KEY;
  
  if (!apiKey || apiKey !== expectedApiKey) {
    logger.warn('Invalid API key attempt', {
      providedKey: apiKey ? '***' : 'none',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
    return;
  }
  
  next();
}

/**
 * Middleware para logging de requests
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length')
  });
  
  // Log da resposta quando ela for enviada
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  
  next();
}
