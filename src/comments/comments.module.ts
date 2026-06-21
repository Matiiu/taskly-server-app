import { Module } from '@nestjs/common';

import { JwtAuthModule } from '@/auth/jwt-auth.module';
import { CommentsResolver } from '@/comments/comments.resolver';
import { CommentsService } from '@/comments/comments.service';

@Module({
  imports: [JwtAuthModule],
  providers: [CommentsResolver, CommentsService],
  exports: [CommentsService, JwtAuthModule],
})
export class CommentsModule {}
