const registryService = require('../services/registryService');

async function create(req, res) {
  const registry = await registryService.createRegistry(req.user.sub, req.body);
  res.status(201).json(registry);
}

async function listOwn(req, res) {
  const result = await registryService.listOwn(req.user.sub, req.query);
  res.status(200).json(result);
}

async function getByShareToken(req, res) {
  const registry = await registryService.getByShareToken(req.params.token);
  res.status(200).json(registry);
}

async function publish(req, res) {
  const registry = await registryService.publish(req.user.sub, Number(req.params.id));
  res.status(200).json(registry);
}

module.exports = { create, listOwn, getByShareToken, publish };
