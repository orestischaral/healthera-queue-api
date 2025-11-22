import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import { IQueueProvider } from '@domain/queue/interfaces/IQueueProvider';
import { QueueMessage } from '@domain/queue/entities/QueueMessage';

@Injectable()
export class BullMqProvider extends IQueueProvider {
  readonly name = 'bullmq';
  private queues: Map<string, Queue> = new Map();
  private connection: { host: string; port: number };
  private workers: Map<string, Worker> = new Map();

  constructor(private readonly config: ConfigService) {
    super();
    this.connection = {
      host: this.config.get<string>('redis.host') || 'localhost',
      port: this.config.get<number>('redis.port') || 6379,
    };
  }

  async connect(): Promise<void> {
    const isHealthy = await this.healthCheck();
    if (!isHealthy) {
      throw new Error('Failed to connect to Redis');
    }
  }

  async disconnect(): Promise<void> {
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    this.workers.clear();

    for (const queue of this.queues.values()) {
      await queue.close();
    }
    this.queues.clear();
  }

  async publish(message: QueueMessage): Promise<string> {
    const queue = await this.getOrCreateQueue(message.queueName);
    const job: Job = await queue.add(
      message.id,
      {
        payload: message.payload,
        attributes: message.attributes,
      },
      {
        jobId: message.id,
      },
    );
    return job.id ?? message.id;
  }

  async receive(
    queueName: string,
    maxMessages: number = 10,
  ): Promise<QueueMessage[]> {
    const queue = await this.getOrCreateQueue(queueName);
    const jobs = await queue.getJobs(
      ['waiting', 'delayed'],
      0,
      maxMessages - 1,
    );

    return jobs.map(
      (job) =>
        new QueueMessage(
          job.id ?? '',
          queueName,
          job.data.payload,
          job.data.attributes,
          job.id,
        ),
    );
  }

  async acknowledge(queueName: string, receiptHandle: string): Promise<void> {
    const queue = await this.getOrCreateQueue(queueName);
    const job = await queue.getJob(receiptHandle);
    if (job) {
      await job.remove();
    }
  }

  async subscribeToQueue(
    queueName: string,
    handler: (message: QueueMessage) => Promise<void>,
  ): Promise<void> {
    if (this.workers.has(queueName)) {
      throw new Error(`Worker already subscribed to queue: ${queueName}`);
    }

    const worker = new Worker(
      queueName,
      async (job: Job) => {
        const message = new QueueMessage(
          job.id ?? '',
          queueName,
          job.data.payload,
          job.data.attributes,
          job.id,
        );
        await handler(message);
      },
      {
        connection: this.connection,
      },
    );

    this.workers.set(queueName, worker);
  }

  async unsubscribeFromQueue(queueName: string): Promise<void> {
    const worker = this.workers.get(queueName);

    if (!worker) {
      throw new Error(`No worker subscribed to queue: ${queueName}`);
    }

    await worker.close();
    this.workers.delete(queueName);
  }

  async createQueue(queueName: string): Promise<string> {
    await this.getOrCreateQueue(queueName);
    return queueName;
  }

  async deleteQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.obliterate({ force: true });
      await queue.close();
      this.queues.delete(queueName);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const testQueue = new Queue('health-check', {
        connection: this.connection,
      });
      await testQueue.client;
      await testQueue.close();
      return true;
    } catch {
      return false;
    }
  }

  private async getOrCreateQueue(queueName: string): Promise<Queue> {
    let queue = this.queues.get(queueName);
    if (!queue) {
      queue = new Queue(queueName, { connection: this.connection });
      this.queues.set(queueName, queue);
    }
    return queue;
  }
}
