import { NotFoundException } from '@nestjs/common';

import { UserNotFoundException } from '@/common/exceptions/user-not-found.exception';

describe('UserNotFoundException', () => {
  const CODE = '@mateo';
  const DOCUMENT_NUMBER = '123456';
  const NOT_FOUND_STATUS = 404;

  it('uses a generic message when no lookup field is given', () => {
    expect(new UserNotFoundException().message).toBe('User not found');
  });

  it('includes the code when looked up by code', () => {
    expect(new UserNotFoundException({ code: CODE }).message).toBe(
      `User with code ${CODE} not found`,
    );
  });

  it('includes the document when looked up by document number', () => {
    expect(new UserNotFoundException({ documentNumber: DOCUMENT_NUMBER }).message).toBe(
      `User with document ${DOCUMENT_NUMBER} not found`,
    );
  });

  it('is a NotFoundException with status 404', () => {
    const error = new UserNotFoundException();

    expect(error).toBeInstanceOf(NotFoundException);
    expect(error.getStatus()).toBe(NOT_FOUND_STATUS);
  });
});
