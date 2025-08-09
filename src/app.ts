import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config';
import routes from './routes';
import { logger } from './utils';
import { requestLogger } from './middlewares';

/**
 * Classe principal da aplicação Aleen IA
 */
class AleenApp {
  public app: express.Application;
  
  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Inicializa os middlewares
   */
  private initializeMiddlewares(): void {
    // Security
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: config.app.env === 'production' ? false : true,
      credentials: true
    }));
    
    // Body parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // Trust proxy for correct IP logging
    this.app.set('trust proxy', true);
    
    // Request logging
    this.app.use(requestLogger);
  }

  /**
   * Inicializa as rotas
   */
  private initializeRoutes(): void {
    // API routes
    this.app.use('/api', routes);
    
    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Aleen IA API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    });
    
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found'
      });
    });
  }

  /**
   * Inicializa o tratamento de erros
   */
  private initializeErrorHandling(): void {
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    });
  }

  /**
   * Inicia o servidor
   */
  public listen(): void {
    this.app.listen(config.app.port, () => {
      logger.info('Aleen IA started successfully', {
        port: config.app.port,
        env: config.app.env,
        nodeVersion: process.version,
        pid: process.pid
      });
    });
  }
}

export default AleenApp;
