import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

import { formatGraphqlError } from '@/config/graphql/format-graphql-error';

ConfigModule.forRoot({
  envFilePath: `.env.${process.env.NODE_ENV || 'local'}`,
}).catch(() => {
  process.exit(1);
});

const configService = new ConfigService();

export const GraphqlConfig: ApolloDriverConfig = {
  driver: ApolloDriver,
  autoSchemaFile: configService.get<string>('GRAPHQL_AUTO_SCHEMA') === 'true',
  playground: configService.get<string>('GRAPHQL_PLAYGROUND') === 'true',
  formatError: formatGraphqlError,
  // Stacktraces expose file paths and internals: keep them for local debugging only
  includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
};
