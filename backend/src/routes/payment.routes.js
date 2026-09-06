const express = require('express');
const PaymentController = require('../controllers/payment.controller');

const router = express.Router();

router.post('/', PaymentController.createPayment);
router.post('/reversal', PaymentController.reversePayment);
router.post('/:id/reversal', PaymentController.reversePayment);
router.get('/:id', PaymentController.getPaymentById);

module.exports = router;
