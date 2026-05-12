const authService = require('../services/authService');

async function register(req, res) {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}

async function verifyEmail(req, res) {
  const { token } = req.query;
  const result = await authService.verifyEmail(token);
  res.status(200).json(result);
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

async function forgotPassword(req, res) {
  const result = await authService.forgotPassword(req.body.email);
  res.status(200).json(result);
}

async function resetPassword(req, res) {
  const { token, newPassword } = req.body;
  const result = await authService.resetPassword(token, newPassword);
  res.status(200).json(result);
}

module.exports = { register, verifyEmail, login, refresh, logout, forgotPassword, resetPassword };