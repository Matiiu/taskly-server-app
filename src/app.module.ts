import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ConfigModule } from '@nestjs/config';
import { ApolloDriverConfig } from '@nestjs/apollo';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { PrismaModule } from './prisma/prisma.module';
import { GraphqlConfig } from '@/config/graphql/graphql.config';
import { AuthModule } from '@/auth/auth.module';
import { UsersModule } from '@/users/users.module';
import { TasksModule } from '@/tasks/tasks.module';
import { AuditLogModule } from '@/audit-log/audit-log.module';
import { CommonModule } from '@/common/common.module';
import { TaskAssigneesModule } from '@/task-assignees/task-assignees.module';
import { CommentsModule } from '@/comments/comments.module';
import '@/common/enums/global.enum';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'local'}`,
    }),
    EventEmitterModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>(GraphqlConfig),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    TasksModule,
    TaskAssigneesModule,
    CommentsModule,
    AuditLogModule,
  ],
})
export class AppModule {}
