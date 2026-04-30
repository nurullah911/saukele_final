const authService = require('../services/authService');

async function register(req, res) {
  const user = await authService.register(req.body);
  res.status(201).json(user);
}

async function login(req, res) {
  const tokens = await authService.login(req.body);
  res.status(200).json(tokens);
}

async function refresh(req, res) {
  const result = await authService.refresh(req.body.refreshToken);
  res.status(200).json(result);
}

async function logout(req, res) {
  await authService.logout(req.body.refreshToken);
  res.status(204).send();
}

module.exports = { register, login, refresh, logout };
