import { QueueMessage } from '../entities/QueueMessage';

export abstract class IQueueProvider {
  readonly name: string;

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  abstract publish(message: QueueMessage): Promise<string>;
  abstract receive(
    queueName: string,
    maxMessages?: number,
  ): Promise<QueueMessage[]>;
  abstract acknowledge(queueName: string, receiptHandle: string): Promise<void>;

  abstract createQueue(queueName: string): Promise<string>;
  abstract deleteQueue(queueName: string): Promise<void>;

  abstract healthCheck(): Promise<boolean>;
}
