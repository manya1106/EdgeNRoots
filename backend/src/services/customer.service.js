const CustomerRepository = require('../repositories/customer.repository');
const { validateCreateCustomer } = require('../validators/customer.validator');
const { ConflictError, NotFoundError } = require('../utils/errors');

class CustomerService {
  static async createCustomer(data) {
    const validated = validateCreateCustomer(data);

    // Check for duplicate email
    const existing = await CustomerRepository.findByEmail(validated.email);
    if (existing) {
      throw new ConflictError(`Customer with email '${validated.email}' already exists`);
    }

    return await CustomerRepository.create(validated);
  }

  static async getCustomerById(id) {
    const customer = await CustomerRepository.findById(id);
    if (!customer) {
      throw new NotFoundError(`Customer with id ${id} not found`);
    }
    return customer;
  }

  static async getAllCustomers() {
    return await CustomerRepository.findAll();
  }
}

module.exports = CustomerService;
