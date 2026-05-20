'use strict';

const kinshipService = require('../services/kinshipService');

async function setKinship(req, res) {
  const relation = await kinshipService.setKinship(req.user.sub, req.body);
  res.status(201).json(relation);
}

async function getKinship(req, res) {
  const coupleId = Number(req.params.coupleId);
  const relation = await kinshipService.getKinship(req.user.sub, coupleId);
  res.status(200).json(relation);
}

async function updateKinship(req, res) {
  const coupleId = Number(req.params.coupleId);
  const relation = await kinshipService.updateKinship(req.user.sub, coupleId, req.body);
  res.status(200).json(relation);
}

async function deleteKinship(req, res) {
  const coupleId = Number(req.params.coupleId);
  await kinshipService.deleteKinship(req.user.sub, coupleId);
  res.status(204).send();
}

async function getFamilyTree(req, res) {
  const tree = await kinshipService.getFamilyTree(Number(req.params.coupleId));
  res.status(200).json(tree);
}

module.exports = { setKinship, getKinship, updateKinship, deleteKinship, getFamilyTree };
