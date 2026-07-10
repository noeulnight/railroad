import Joi from 'joi';

export const configurationValidationSchema = Joi.object({
  PORT: Joi.number().port().default(3000),
});
