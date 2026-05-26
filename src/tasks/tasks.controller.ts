import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TaskStatus } from './enums/task-status.enum';
import { TasksService } from './tasks.service';
import { CreateTaskInput } from './dto/create-task.input';
import { UpdateTaskInput } from './dto/update-task.input';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() createTaskInput: CreateTaskInput) {
    return this.tasksService.create(createTaskInput);
  }

  @Get()
  findAll(
    @Query('status', new ParseEnumPipe(TaskStatus, { optional: true }))
    status?: TaskStatus,
    @Query('categoryId') categoryId?: string,
  ) {
    const parsedCategoryId = categoryId
      ? Number.parseInt(categoryId, 10)
      : undefined;
    return this.tasksService.findAll({
      status,
      categoryId: Number.isNaN(parsedCategoryId) ? undefined : parsedCategoryId,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskInput: Omit<UpdateTaskInput, 'id'>,
  ) {
    return this.tasksService.update({ id, ...updateTaskInput });
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.remove(id);
  }
}
