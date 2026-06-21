import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModuleAsyncOptions } from '@nestjs/jwt';

ConfigModule.forRoot({
  envFilePath: `.env.${process.env.NODE_ENV || 'local'}`,
}).catch(() => {
  process.exit(1);
});

const configService = new ConfigService();

const DEFAULT_JWT_EXPIRES_IN_SECONDS = 60 * 60 * 4;
const millisecondsToSeconds = 1000;

const parseJwtExpiresInSeconds = (value?: string): number => {
  if (!value?.trim()) {
    return DEFAULT_JWT_EXPIRES_IN_SECONDS;
  }

  const normalized = value.trim();

  // Numeric env values are treated as milliseconds for backward compatibility.
  if (/^\d+$/.test(normalized)) {
    return Math.max(1, Math.floor(Number(normalized) / millisecondsToSeconds));
  }

  const durationMatch = normalized.match(/^(\d+)(ms|s|m|h|d)$/i);

  if (!durationMatch) {
    return DEFAULT_JWT_EXPIRES_IN_SECONDS;
  }

  const valueNumber = Number(durationMatch[1]);
  const unit = durationMatch[2].toLowerCase();

  switch (unit) {
    case 'ms':
      return Math.max(1, Math.floor(valueNumber / millisecondsToSeconds));
    case 's':
      return valueNumber;
    case 'm':
      return valueNumber * 60;
    case 'h':
      return valueNumber * 60 * 60;
    case 'd':
      return valueNumber * 60 * 60 * 24;
    default:
      return DEFAULT_JWT_EXPIRES_IN_SECONDS;
  }
};

export const JWTConfig: JwtModuleAsyncOptions = {
  useFactory: () => ({
    signOptions: {
      expiresIn: parseJwtExpiresInSeconds(configService.get<string>('JWT_EXPIRES_IN')),
    },
    secret: configService.get<string>('JWT_SECRET'),
  }),
};
