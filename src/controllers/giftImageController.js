'use strict';

const giftImageService = require('../services/giftImageService');

async function addImage(req, res) {
  const result = await giftImageService.addImage(
    req.user.sub,
    Number(req.params.id),
    req.body.url,
    req.body.isPrimary || false
  );
  res.status(201).json(result);
}

async function getImages(req, res) {
  const result = await giftImageService.getImages(Number(req.params.id));
  res.status(200).json(result);
}

async function deleteImage(req, res) {
  await giftImageService.deleteImage(req.user.sub, Number(req.params.imageId));
  res.status(204).send();
}

module.exports = { addImage, getImages, deleteImage };
