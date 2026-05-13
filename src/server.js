const app = require('./app');
const env = require('./config/env');

// Запускаем email воркер
require('./workers/emailWorker');

app.listen(env.port, () => {
  console.log(`Saukele API running on http://localhost:${env.port}`);
  console.log(`Swagger UI available at http://localhost:${env.port}/docs`);
});