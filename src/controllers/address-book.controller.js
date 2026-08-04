'use strict';
const addressBookService = require('../services/address-book.service');
const jwt = require('jsonwebtoken');

function getEmailFromReq(req) {
  // Extract email from Bearer token or from body fallback
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-change-in-production');
      return decoded.email || decoded.sub || null;
    } catch (e) {
      return null;
    }
  }
  return req.body?.userEmail || null;
}

exports.getAddresses = async (req, res, next) => {
  try {
    const email = getEmailFromReq(req);
    if (!email) return res.status(401).json({ error: 'Unauthorized.' });
    const addresses = await addressBookService.getAddresses(email);
    res.json(addresses);
  } catch (err) {
    next(err);
  }
};

exports.saveAddress = async (req, res, next) => {
  try {
    const email = getEmailFromReq(req);
    if (!email) return res.status(401).json({ error: 'Unauthorized.' });
    const saved = await addressBookService.saveAddress(email, req.body);
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

exports.deleteAddress = async (req, res, next) => {
  try {
    const email = getEmailFromReq(req);
    if (!email) return res.status(401).json({ error: 'Unauthorized.' });
    const result = await addressBookService.deleteAddress(email, req.params.id);
    if (!result) return res.status(404).json({ error: 'Address not found.' });
    res.json({ message: 'Address deleted.' });
  } catch (err) {
    next(err);
  }
};
