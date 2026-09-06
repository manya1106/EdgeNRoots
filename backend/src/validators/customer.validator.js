const Joi = require('joi');
const { ValidationError } = require('../utils/errors');

const createCustomerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255).required().messages({
    'string.base': 'Name must be a string',
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters long',
    'any.required': 'Name is required'
  }),
  email: Joi.string().trim().email().max(255).required().messages({
    'string.base': 'Email must be a string',
    'string.empty': 'Email is required',
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required'
  })
});

function validateCreateCustomer(data) {
  const { error, value } = createCustomerSchema.validate(data, { abortEarly: false, stripUnknown: true });
  if (error) {
    const details = error.details.map((d) => d.message);
    throw new ValidationError(details[0], details);
  }
  return value;
}

module.exports = {
  validateCreateCustomer
};
