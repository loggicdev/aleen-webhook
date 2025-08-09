const Redis = require('ioredis');

async function testRedis() {
  try {
    console.log('Testando conexão Redis...');
    
    // Testar com URL
    const redis = new Redis('redis://localhost:6379');
    
    redis.on('connect', () => {
      console.log('✅ Redis conectado via URL!');
    });
    
    redis.on('error', (error) => {
      console.log('❌ Erro Redis:', error.message);
    });
    
    await redis.set('test', 'hello');
    const result = await redis.get('test');
    console.log('✅ Teste de escrita/leitura:', result);
    
    await redis.quit();
    console.log('✅ Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testRedis();
