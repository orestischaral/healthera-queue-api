import { Logger } from '@nestjs/common';
import { QueueMessage } from '@domain/queue/entities/QueueMessage';
import { IQueueProvider } from '@domain/queue/interfaces/IQueueProvider';

export type QueueRouting = {
  [queueName: string]: 'bullmq' | 'rabbitmq' | 'both';
};

export class CompositeQueueProvider extends IQueueProvider {
  private readonly logger = new Logger(CompositeQueueProvider.name);
  private subscriptions = new Map<
    string,
    { bullmq?: Function; rabbitmq?: Function }
  >();

  constructor(
    private readonly bullmqProvider: IQueueProvider,
    private readonly rabbitmqProvider: IQueueProvider,
    private readonly routing: QueueRouting = { '*': 'bullmq' },
  ) {
    super();
  }

  private getProvidersForQueue(queueName: string): IQueueProvider[] {
    const config = this.routing[queueName] || this.routing['*'] || 'bullmq';
    const providers: IQueueProvider[] = [];

    if (config === 'bullmq' || config === 'both') {
      providers.push(this.bullmqProvider);
    }
    if (config === 'rabbitmq' || config === 'both') {
      providers.push(this.rabbitmqProvider);
    }

    return providers;
  }

  async connect(): Promise<void> {
    try {
      await Promise.all([
        this.bullmqProvider.connect(),
        this.rabbitmqProvider.connect(),
      ]);
      this.logger.log('CompositeQueueProvider connected to all providers');
    } catch (error) {
      this.logger.error(
        `Failed to connect CompositeQueueProvider: ${error.message}`,
      );
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await Promise.all([
        this.bullmqProvider.disconnect(),
        this.rabbitmqProvider.disconnect(),
      ]);
      this.logger.log('CompositeQueueProvider disconnected from all providers');
    } catch (error) {
      this.logger.error(
        `Failed to disconnect CompositeQueueProvider: ${error.message}`,
      );
      throw error;
    }
  }

  async createQueue(queueName: string): Promise<string> {
    const providers = this.getProvidersForQueue(queueName);
    if (providers.length === 0) {
      throw new Error(`No provider configured for queue: ${queueName}`);
    }

    const results = await Promise.all(
      providers.map((p) => p.createQueue(queueName)),
    );
    this.logger.log(
      `Queue '${queueName}' created on ${providers.length} provider(s)`,
    );

    return results[0]; // Return first result
  }

  async deleteQueue(queueName: string): Promise<void> {
    const providers = this.getProvidersForQueue(queueName);
    if (providers.length === 0) {
      throw new Error(`No provider configured for queue: ${queueName}`);
    }

    await Promise.all(providers.map((p) => p.deleteQueue(queueName)));
    this.logger.log(
      `Queue '${queueName}' deleted from ${providers.length} provider(s)`,
    );
  }

  async publish(message: QueueMessage): Promise<string> {
    const providers = this.getProvidersForQueue(message.queueName);
    if (providers.length === 0) {
      throw new Error(`No provider configured for queue: ${message.queueName}`);
    }
    const results = await Promise.all(providers.map((p) => p.publish(message)));
    this.logger.log(
      `Message published to '${message.queueName}' on ${providers.length} provider(s)`,
    );

    return results[0];
  }

  async receive(
    queueName: string,
    maxMessages?: number,
  ): Promise<QueueMessage[]> {
    const providers = this.getProvidersForQueue(queueName);
    if (providers.length === 0) {
      throw new Error(`No provider configured for queue: ${queueName}`);
    }

    return providers[0].receive(queueName, maxMessages);
  }

  async acknowledge(queueName: string, receiptHandle: string): Promise<void> {
    const providers = this.getProvidersForQueue(queueName);
    if (providers.length === 0) {
      throw new Error(`No provider configured for queue: ${queueName}`);
    }

    await Promise.all(
      providers.map((p) => p.acknowledge(queueName, receiptHandle)),
    );
    this.logger.log(
      `Message acknowledged in '${queueName}' on ${providers.length} provider(s)`,
    );
  }

  async subscribeToQueue(
    queueName: string,
    handler: (message: QueueMessage) => Promise<void>,
  ): Promise<void> {
    const providers = this.getProvidersForQueue(queueName);
    if (providers.length === 0) {
      throw new Error(`No provider configured for queue: ${queueName}`);
    }

    if (!this.subscriptions.has(queueName)) {
      this.subscriptions.set(queueName, {});
    }

    const subs = this.subscriptions.get(queueName)!;

    const bullmqCallback = async (message: QueueMessage) => {
      try {
        await handler(message);
      } catch (error) {
        this.logger.error(
          `Error processing message from BullMQ in '${queueName}': ${error}`,
        );
      }
    };

    const rabbitmqCallback = async (message: QueueMessage) => {
      try {
        await handler(message);
      } catch (error) {
        this.logger.error(
          `Error processing message from RabbitMQ in '${queueName}': ${error}`,
        );
      }
    };

    const subscriptions: Promise<void>[] = [];
    for (const provider of providers) {
      if (provider === this.bullmqProvider && !subs.bullmq) {
        subscriptions.push(
          provider.subscribeToQueue(queueName, bullmqCallback),
        );
        subs.bullmq = bullmqCallback;
      } else if (provider === this.rabbitmqProvider && !subs.rabbitmq) {
        subscriptions.push(
          provider.subscribeToQueue(queueName, rabbitmqCallback),
        );
        subs.rabbitmq = rabbitmqCallback;
      }
    }

    await Promise.all(subscriptions);
    this.logger.log(
      `Subscribed to '${queueName}' on ${providers.length} provider(s)`,
    );
  }

  async unsubscribeFromQueue(queueName: string): Promise<void> {
    const providers = this.getProvidersForQueue(queueName);
    if (providers.length === 0) {
      throw new Error(`No provider configured for queue: ${queueName}`);
    }

    await Promise.all(providers.map((p) => p.unsubscribeFromQueue(queueName)));

    this.subscriptions.delete(queueName);
    this.logger.log(
      `Unsubscribed from '${queueName}' on ${providers.length} provider(s)`,
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      const results = await Promise.all([
        this.bullmqProvider.healthCheck(),
        this.rabbitmqProvider.healthCheck(),
      ]);
      return results.every((r) => r === true);
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return false;
    }
  }
}
