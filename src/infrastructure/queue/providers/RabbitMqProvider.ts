import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Channel, connect } from 'amqplib';
import { IQueueProvider } from '@domain/queue/interfaces/IQueueProvider';
import { QueueMessage } from '@domain/queue/entities/QueueMessage';

@Injectable()
export class RabbitMqProvider extends IQueueProvider {
  readonly name = 'rabbitmq';
  private connection: any = null;
  private channel: any = null;
  private readonly url: string;
  private readonly retryAttempts: number;
  private readonly retryDelayMs: number;

  constructor(private readonly config: ConfigService) {
    super();
    this.url =
      this.config.get<string>('rabbitmq.url') ||
      'amqp://guest:guest@localhost:5672';
    this.retryAttempts = this.config.get<number>('rabbitmq.retryAttempts') || 5;
    this.retryDelayMs =
      this.config.get<number>('rabbitmq.retryDelayMs') || 1000;
  }

  async connect(): Promise<void> {
    await this.connectWithRetry();
  }

  async disconnect(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }

  async publish(message: QueueMessage): Promise<string> {
    const channel = await this.getChannel();
    const content = Buffer.from(
      JSON.stringify({
        payload: message.payload,
        attributes: message.attributes,
      }),
    );

    channel.sendToQueue(message.queueName, content, {
      messageId: message.id,
      persistent: true,
    });

    return message.id;
  }

  async receive(
    queueName: string,
    maxMessages: number = 10,
  ): Promise<QueueMessage[]> {
    const channel = await this.getChannel();
    const messages: QueueMessage[] = [];

    for (let i = 0; i < maxMessages; i++) {
      const msg = await channel.get(queueName, { noAck: false });
      if (!msg) break;

      const data = JSON.parse(msg.content.toString());
      messages.push(
        new QueueMessage(
          msg.properties.messageId || '',
          queueName,
          data.payload,
          data.attributes,
          msg.fields.deliveryTag.toString(),
        ),
      );
    }

    return messages;
  }

  async acknowledge(queueName: string, receiptHandle: string): Promise<void> {
    const channel = await this.getChannel();
    channel.ack({
      fields: { deliveryTag: parseInt(receiptHandle, 10) },
    } as any);
  }

  async createQueue(queueName: string): Promise<string> {
    const channel = await this.getChannel();
    await channel.assertQueue(queueName, { durable: true });
    return queueName;
  }

  async deleteQueue(queueName: string): Promise<void> {
    const channel = await this.getChannel();
    await channel.deleteQueue(queueName);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.getChannel();
      return true;
    } catch {
      return false;
    }
  }

  private async connectWithRetry(): Promise<void> {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        this.connection = await connect(this.url);

        this.channel = await this.connection.createChannel();
        return;
      } catch (error) {
        if (attempt === this.retryAttempts) {
          throw new Error(
            `Failed to connect to RabbitMQ after ${this.retryAttempts} attempts`,
          );
        }
        await this.delay(this.retryDelayMs * attempt);
      }
    }
  }

  private async getChannel(): Promise<Channel> {
    if (!this.channel) {
      await this.connectWithRetry();
    }
    return this.channel!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
