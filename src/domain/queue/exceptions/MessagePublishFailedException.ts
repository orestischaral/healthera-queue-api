export class MessagePublishFailedException extends Error {
  constructor(queueName: string, reason?: string) {
    super(
      `Failed to publish message to queue "${queueName}"${reason ? `: ${reason}` : ''}`,
    );
    this.name = 'MessagePublishFailedException';
  }
}
