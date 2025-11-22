import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { PublishMessageCommand } from '@application/queue/commands/PublishMessageCommand';
import { ReceiveMessagesQuery } from '@application/queue/queries/ReceiveMessagesQuery';
import { AcknowledgeMessageCommand } from '@application/queue/commands/AcknowledgeMessageCommand';

import { PublishMessageDto } from '../dto/PublishMessageDto';
import { ReceiveMessagesDto } from '../dto/ReceiveMessagesDto';

@Controller('queues/:name/messages')
export class MessageController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async publishMessage(
    @Param('name') name: string,
    @Body() dto: PublishMessageDto,
  ): Promise<{ messageId: string }> {
    const messageId = await this.commandBus.execute(
      new PublishMessageCommand(name, dto.payload, dto.attributes),
    );
    return { messageId };
  }

  @Get()
  async receiveMessages(
    @Param('name') name: string,
    @Query() query: ReceiveMessagesDto,
  ): Promise<{ messages: any[] }> {
    const messages = await this.queryBus.execute(
      new ReceiveMessagesQuery(name, query.maxMessages),
    );
    return { messages };
  }

  @Delete(':receiptHandle')
  async acknowledgeMessage(
    @Param('name') name: string,
    @Param('receiptHandle') receiptHandle: string,
  ): Promise<void> {
    await this.commandBus.execute(
      new AcknowledgeMessageCommand(name, receiptHandle),
    );
  }
}
