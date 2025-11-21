export class QueueNotFoundException extends Error {
  constructor(queueName: string) {
    super(`Queue "${queueName}" not found`);
    this.name = 'QueueNotFoundException';
  }
}
