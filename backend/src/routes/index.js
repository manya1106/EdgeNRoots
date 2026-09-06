const express = require('express');
const customerRoutes = require('./customer.routes');
const policyRoutes = require('./policy.routes');
const paymentRoutes = require('./payment.routes');
const accountingRoutes = require('./accounting.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

router.use('/customers', customerRoutes);
router.use('/policies', policyRoutes);
router.use('/payments', paymentRoutes);
router.use('/accounting', accountingRoutes);

module.exports = router;
