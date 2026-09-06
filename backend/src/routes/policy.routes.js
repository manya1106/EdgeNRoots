const express = require('express');
const PolicyController = require('../controllers/policy.controller');

const router = express.Router();

router.post('/', PolicyController.createPolicy);
router.get('/:id', PolicyController.getPolicyById);
router.get('/:id/ledger', PolicyController.getPolicyLedger);
router.get('/:id/summary', PolicyController.getPolicySummary);

module.exports = router;
