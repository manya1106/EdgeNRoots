const CustomerService = require('../services/customer.service');
const { successResponse } = require('../utils/response');

class CustomerController {
  static async createCustomer(req, res, next) {
    try {
      const customer = await CustomerService.createCustomer(req.body);
      return successResponse(res, customer, 'Customer created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async getCustomerById(req, res, next) {
    try {
      const customerId = parseInt(req.params.id, 10);
      const customer = await CustomerService.getCustomerById(customerId);
      return successResponse(res, customer, 'Customer retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getAllCustomers(req, res, next) {
    try {
      const customers = await CustomerService.getAllCustomers();
      return successResponse(res, customers, 'Customers retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CustomerController;
