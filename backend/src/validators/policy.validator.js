const Joi = require('joi');
const { ValidationError } = require('../utils/errors');

const createPolicySchema = Joi.object({
  customer_id: Joi.number().integer().positive().required().messages({
    'number.base': 'customer_id must be a number',
    'number.integer': 'customer_id must be an integer',
    'number.positive': 'customer_id must be positive',
    'any.required': 'customer_id is required'
  }),
  policy_number: Joi.string().trim().min(3).max(100).required().messages({
    'string.base': 'policy_number must be a string',
    'string.empty': 'policy_number is required',
    'any.required': 'policy_number is required'
  }),
  premium_amount: Joi.number().positive().precision(2).required().messages({
    'number.base': 'premium_amount must be a numeric value',
    'number.positive': 'premium_amount must be greater than 0',
    'any.required': 'premium_amount is required'
  }),
  gst_rate: Joi.number().min(0).max(100).precision(2).default(18.00).messages({
    'number.base': 'gst_rate must be a number',
    'number.min': 'gst_rate cannot be negative',
    'number.max': 'gst_rate cannot exceed 100%'
  })
});

function validateCreatePolicy(data) {
  const { error, value } = createPolicySchema.validate(data, { abortEarly: false, stripUnknown: true });
  if (error) {
    const details = error.details.map((d) => d.message);
    throw new ValidationError(details[0], details);
  }
  return value;
}

module.exports = {
  validateCreatePolicy
};
