import { v4 as uuidv4 } from 'uuid';

export class QueueMessage {
  constructor(
    public readonly id: string,
    public readonly queueName: string,
    public readonly payload: unknown,
    public readonly attributes?: Record<string, string>,
    public readonly receiptHandle?: string,
    public readonly createdAt: Date = new Date(),
  ) {}

  static create(
    queueName: string,
    payload: unknown,
    attributes?: Record<string, string>,
  ): QueueMessage {
    return new QueueMessage(uuidv4(), queueName, payload, attributes);
  }
}
