import * as Joi from 'joi';

export const validationSchema = Joi.object({
  DATABASE_URL: Joi.string().uri().required(),
  ELASTICSEARCH_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string().uri().required(),
  PORT: Joi.number().default(3000),
  CACHE_TTL_SECONDS: Joi.number().default(60),
});
