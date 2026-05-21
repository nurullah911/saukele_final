'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimit');

const authRoutes = require('./routes/auth.routes');
const registryRoutes = require('./routes/registry.routes');
const giftRoutes = require('./routes/gift.routes');
const contributionRoutes = require('./routes/contribution.routes');
const kinshipRoutes = require('./routes/kinship.routes');
const adminRoutes = require('./routes/admin.routes');
const logisticsRoutes = require('./routes/logistics.routes');
const notificationRoutes = require('./routes/notification.routes');
const usersRoutes = require('./routes/users.routes');
const inviteRoutes = require('./routes/invite.routes');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
if (env.nodeEnv !== 'test') app.use(morgan('dev'));
app.use(apiLimiter);

const openApiDocument = YAML.load(path.join(__dirname, '..', 'openapi.yaml'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.get('/health', (req, res) => res.json({ status: 'ok', version: '2.0.0' }));

app.use('/api/auth', authRoutes);
app.use('/api/registries', registryRoutes);
app.use('/api/gifts', giftRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/kinship', kinshipRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', usersRoutes);
app.use('/api', inviteRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

module.exports = app;
