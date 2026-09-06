const express = require('express');
const CustomerController = require('../controllers/customer.controller');

const router = express.Router();

router.post('/', CustomerController.createCustomer);
router.get('/', CustomerController.getAllCustomers);
router.get('/:id', CustomerController.getCustomerById);

module.exports = router;
