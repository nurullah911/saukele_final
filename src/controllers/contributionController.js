const crypto = require('crypto');
const env = require('../config/env');
const contributionService = require('../services/contributionService');
const HttpError = require('../utils/httpError');

async function createContribution(req, res) {
  const contribution = await contributionService.createContribution(req.user.sub, req.body);
  res.status(201).json(contribution);
}

async function paymentWebhook(req, res) {
  const signature = req.headers['x-saukele-signature'];
  if (env.paymentWebhookSecret && signature) {
    const body = JSON.stringify(req.body);
    const expected = crypto.createHmac('sha256', env.paymentWebhookSecret).update(body).digest('hex');
    if (signature !== expected) throw new HttpError(400, 'Invalid signature');
  }

  const result = await contributionService.processWebhook(req.body.paymentRef, req.body.status);
  res.status(200).json(result);
}

module.exports = { createContribution, paymentWebhook };
