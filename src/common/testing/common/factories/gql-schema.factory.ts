import type { Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } from '@nestjs/graphql';
import type { GraphQLSchema } from 'graphql';

// Registers the shared GraphQL enums (SortOrder, ...) that resolver inputs rely on.
import '@/common/enums/global.enum';

/**
 * Builds the GraphQL schema for the given resolvers. Building it runs the
 * decorator type factories (`@Query(() => Type)`, `@Args(..., { type: () => ID })`).
 */
export const buildResolverSchema = async (resolvers: Type<unknown>[]): Promise<GraphQLSchema> => {
  const moduleRef = await Test.createTestingModule({
    imports: [GraphQLSchemaBuilderModule],
  }).compile();

  return moduleRef.get(GraphQLSchemaFactory).create(resolvers);
};
