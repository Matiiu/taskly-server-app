export const buildAssigneeType = (
  overrides: Partial<{
    id: string;
    name: string;
    firstSurname: string;
    secondSurname: string | null;
    email: string;
    code: string;
  }> = {},
) => ({
  id: 'user-id-2',
  name: 'Jane',
  firstSurname: 'Smith',
  secondSurname: null,
  email: 'jane@example.com',
  code: '@janesmith',
  ...overrides,
});
