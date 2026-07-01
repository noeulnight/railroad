import Joi from 'joi';

export const configurationValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().uri().required(),
  PORT: Joi.number().port().default(3000),
});
