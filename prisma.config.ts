import * as dotenv from 'dotenv';

const envFileMap: Record<string, string> = {
  production: '.env.production',
  debug: '.env.local',
  development: '.env.local',
  test: '.env.test',
};

const nodeEnv = process.env['NODE_ENV'] ?? 'development';
const envFile = envFileMap[nodeEnv] ?? '.env.local';

dotenv.config({ path: envFile });

import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
