import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryInput } from './dto/create-category.input';
import { UpdateCategoryInput } from './dto/update-category.input';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  create(createCategoryInput: CreateCategoryInput) {
    return this.prisma.category.create({
      data: createCategoryInput,
      include: { tasks: true },
    });
  }

  findAll() {
    return this.prisma.category.findMany({
      include: { tasks: true },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { tasks: true },
    });

    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    return category;
  }

  async update(updateCategoryInput: UpdateCategoryInput) {
    await this.findOne(updateCategoryInput.id);

    const { id, ...data } = updateCategoryInput;
    return this.prisma.category.update({
      where: { id },
      data,
      include: { tasks: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.category.delete({
      where: { id },
      include: { tasks: true },
    });
  }
}
