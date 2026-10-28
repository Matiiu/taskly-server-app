import { buildSchema, graphql, GraphQLError, parse, validate } from 'graphql';

import { formatGraphqlError } from '@/config/graphql/format-graphql-error';

// Same shape as SuggestCodesInput: firstSurname required, secondSurname optional
const schema = buildSchema(`
  input SuggestCodesInput {
    name: String!
    firstSurname: String!
    secondSurname: String
  }

  type Query {
    suggestedCodes(input: SuggestCodesInput!): [String!]!
    status(id: String!): String
  }
`);

/** Runs GraphQL validation on an inline query and returns its first error, as Apollo would. */
const validationErrorFor = (query: string): GraphQLError => validate(schema, parse(query))[0];

describe('formatGraphqlError', () => {
  it('names the input field when null is sent inline to a required field', () => {
    const error = validationErrorFor(
      '{ suggestedCodes(input: { name: "Mateo", firstSurname: null, secondSurname: null }) }',
    );

    expect(formatGraphqlError(error.toJSON(), error)).toEqual({
      message: 'firstSurname is required',
      locations: error.locations,
      extensions: { code: 'BAD_USER_INPUT', field: 'firstSurname' },
    });
  });

  it('names the argument when null is sent inline to a required argument', () => {
    const error = validationErrorFor('{ status(id: null) }');

    expect(formatGraphqlError(error.toJSON(), error).message).toBe('id is required');
  });

  it('names the field when null comes through a variable', async () => {
    const result = await graphql({
      schema,
      source: 'query ($input: SuggestCodesInput!) { suggestedCodes(input: $input) }',
      variableValues: { input: { name: 'Mateo', firstSurname: null } },
    });
    const error = result.errors![0];

    expect(formatGraphqlError(error.toJSON(), error)).toEqual(
      expect.objectContaining({
        message: 'firstSurname is required',
        extensions: { code: 'BAD_USER_INPUT', field: 'firstSurname' },
      }),
    );
  });

  it('accepts null for optional fields (no error to format)', () => {
    expect(
      validate(
        schema,
        parse(
          '{ suggestedCodes(input: { name: "Mateo", firstSurname: "Tavera", secondSurname: null }) }',
        ),
      ),
    ).toHaveLength(0);
  });

  it('leaves other errors untouched', () => {
    const formatted = { message: 'Status Done already exists', extensions: { code: 'CONFLICT' } };

    expect(formatGraphqlError(formatted, new Error('boom'))).toBe(formatted);
  });

  it('leaves the message untouched when the field cannot be found', () => {
    const formatted = { message: 'Expected value of type "String!", found null.' };

    expect(formatGraphqlError(formatted, new Error('not a GraphQLError'))).toBe(formatted);
  });
});
