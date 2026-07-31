export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL,
  elasticsearchUrl: process.env.ELASTICSEARCH_URL,
  redisUrl: process.env.REDIS_URL,
  cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS ?? '60', 10),
});
