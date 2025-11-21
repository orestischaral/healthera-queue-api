import { QueueMessage } from '../entities/QueueMessage';

export interface IQueueProvider {
  readonly name: string;

  connect(): Promise<void>;
  disconnect(): Promise<void>;

  publish(message: QueueMessage): Promise<string>;
  receive(queueName: string, maxMessages?: number): Promise<QueueMessage[]>;
  acknowledge(queueName: string, receiptHandle: string): Promise<void>;

  createQueue(queueName: string): Promise<string>;
  deleteQueue(queueName: string): Promise<void>;

  healthCheck(): Promise<boolean>;
}
