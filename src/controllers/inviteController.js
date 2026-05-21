'use strict';

const inviteService = require('../services/inviteService');

async function invite(req, res) {
  const result = await inviteService.inviteGuest(
    req.user.sub,
    Number(req.params.registryId),
    req.body.guestEmail
  );
  res.status(201).json(result);
}

async function getInvites(req, res) {
  const result = await inviteService.getInvites(Number(req.params.registryId), req.user.sub);
  res.status(200).json(result);
}

async function respond(req, res) {
  const result = await inviteService.respondInvite(
    req.user.sub,
    Number(req.params.registryId),
    req.body.status
  );
  res.status(200).json(result);
}

async function getMyInvites(req, res) {
  const result = await inviteService.getMyInvites(req.user.sub);
  res.status(200).json(result);
}

module.exports = { invite, getInvites, respond, getMyInvites };
