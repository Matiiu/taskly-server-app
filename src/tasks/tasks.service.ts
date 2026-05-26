import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskInput } from './dto/create-task.input';
import { TaskFilterInput } from './dto/task-filter.input';
import { UpdateTaskInput } from './dto/update-task.input';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  create(createTaskInput: CreateTaskInput) {
    return this.prisma.task.create({
      data: {
        ...createTaskInput,
        status: createTaskInput.status ?? TaskStatus.PENDING,
      },
      include: { category: true },
    });
  }

  findAll(filter?: TaskFilterInput) {
    const where: Prisma.TaskWhereInput = {};

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.categoryId) {
      where.categoryId = filter.categoryId;
    }

    return this.prisma.task.findMany({
      where,
      include: { category: true },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return task;
  }

  async update(updateTaskInput: UpdateTaskInput) {
    await this.findOne(updateTaskInput.id);

    const { id, ...data } = updateTaskInput;
    return this.prisma.task.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.task.delete({
      where: { id },
      include: { category: true },
    });
  }
}
