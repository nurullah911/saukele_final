const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  console.log(`Saukele API running on http://localhost:${env.port}`);
  console.log(`Swagger UI available at http://localhost:${env.port}/docs`);
});
