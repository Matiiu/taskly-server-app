import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModuleAsyncOptions } from '@nestjs/jwt';

ConfigModule.forRoot({
  envFilePath: `.env.${process.env.NODE_ENV || 'local'}`,
}).catch(() => {
  process.exit(1);
});

const configService = new ConfigService();

export const JWTConfig: JwtModuleAsyncOptions = {
  useFactory: () => ({
    signOptions: {
      expiresIn: Number(configService.get('JWT_EXPIRES_IN', 14400000)),
    },
    secret: configService.get<string>('JWT_SECRET'),
  }),
};
