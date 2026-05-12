'use strict';

const logisticsService = require('../services/logisticsService');

async function createOrder(req, res) {
  const order = await logisticsService.createOrder(req.user.sub, req.body);
  res.status(201).json(order);
}

async function getOrders(req, res) {
  const registryId = Number(req.params.registryId);
  const orders = await logisticsService.getOrders(registryId);
  res.status(200).json(orders);
}

async function updateStatus(req, res) {
  const orderId = Number(req.params.id);
  const { status } = req.body;
  const order = await logisticsService.updateStatus(orderId, status);
  res.status(200).json(order);
}

async function getProviders(req, res) {
  res.status(200).json({ providers: logisticsService.getProviders() });
}

module.exports = { createOrder, getOrders, updateStatus, getProviders };
