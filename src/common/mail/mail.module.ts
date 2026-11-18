import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { MailService } from '@/common/mail/mail.service';
import { mailConfig } from '@/config/mail/mail.config';

@Module({
  imports: [ConfigModule.forFeature(mailConfig)],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
