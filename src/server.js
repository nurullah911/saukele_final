const app = require('./app');
const env = require('./config/env');

// Запускаем email воркер
require('./workers/emailWorker');

app.listen(env.port, '0.0.0.0', () => {
  console.log(`API listening on port ${env.port}`);
  console.log('Swagger UI available at /docs');
});
