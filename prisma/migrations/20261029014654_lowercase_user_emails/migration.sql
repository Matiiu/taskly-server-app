-- Emails are now stored in lowercase (register/sign-in normalize them).
-- Fails on the email unique index if two non-released accounts differ only in case:
-- that needs a manual decision, so nothing is changed in that case.
UPDATE "User" SET "email" = lower("email") WHERE "email" <> lower("email");
