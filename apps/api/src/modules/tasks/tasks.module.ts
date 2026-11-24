import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
