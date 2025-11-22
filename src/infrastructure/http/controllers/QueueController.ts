import { Controller, Post, Delete, Body, Param } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CreateQueueCommand } from '@application/queue/commands/CreateQueueCommand';
import { DeleteQueueCommand } from '@application/queue/commands/DeleteQueueCommand';
import { CreateQueueDto } from '../dto/CreateQueueDto';

@Controller('queues')
export class QueueController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  async createQueue(@Body() dto: CreateQueueDto): Promise<{ queue: string }> {
    const queue = await this.commandBus.execute(
      new CreateQueueCommand(dto.name),
    );
    return { queue };
  }

  @Delete(':name')
  async deleteQueue(@Param('name') name: string): Promise<void> {
    await this.commandBus.execute(new DeleteQueueCommand(name));
  }
}
