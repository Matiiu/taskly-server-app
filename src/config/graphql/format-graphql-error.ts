import { GraphQLError, type GraphQLFormattedError, Kind, parse, visit } from 'graphql';

// Inline literal: `input: { firstSurname: null }` → rejected by GraphQL validation, no field name in the message
const NULL_LITERAL_MESSAGE = /^Expected value of type "[^"]+!", found null\.$/;
// Variable: `$input` with firstSurname = null → GraphQL names the path, e.g. "input.firstSurname"
const NULL_VARIABLE_MESSAGE = /got invalid value null at "([^"]+)"; Expected non-nullable type/;

/** Name of the input field or argument whose value is the node GraphQL rejected. */
const findFieldNameInQuery = (error: GraphQLError): string | undefined => {
  const valueStart = error.nodes?.[0]?.loc?.start;

  if (valueStart === undefined || !error.source) return undefined;

  let fieldName: string | undefined;

  visit(parse(error.source), {
    enter(node) {
      if (
        (node.kind === Kind.OBJECT_FIELD || node.kind === Kind.ARGUMENT) &&
        node.value.loc?.start === valueStart
      ) {
        fieldName = node.name.value;
      }
    },
  });

  return fieldName;
};

/** Last segment of a variable path: "input.items[0].name" → "name". */
const lastPathSegment = (path: string): string =>
  path
    .split('.')
    .at(-1)!
    .replace(/\[\d+\]$/, '');

const requiredFieldError = (
  formattedError: GraphQLFormattedError,
  field: string,
): GraphQLFormattedError => ({
  message: `${field} is required`,
  locations: formattedError.locations,
  extensions: { code: 'BAD_USER_INPUT', field },
});

/**
 * Apollo `formatError`: turns "null sent to a required (`!`) field" into "<field> is required".
 * These errors happen before resolvers run, so class-validator never sees them.
 * Everything else passes through unchanged.
 */
export const formatGraphqlError = (
  formattedError: GraphQLFormattedError,
  error: unknown,
): GraphQLFormattedError => {
  const variableMatch = NULL_VARIABLE_MESSAGE.exec(formattedError.message);

  if (variableMatch) {
    return requiredFieldError(formattedError, lastPathSegment(variableMatch[1]));
  }

  if (NULL_LITERAL_MESSAGE.test(formattedError.message) && error instanceof GraphQLError) {
    const field = findFieldNameInQuery(error);

    if (field) return requiredFieldError(formattedError, field);
  }

  return formattedError;
};
