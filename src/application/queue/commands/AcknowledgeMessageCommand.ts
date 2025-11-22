export class AcknowledgeMessageCommand {
  constructor(
    public readonly queueName: string,
    public readonly receiptHandle: string,
  ) {}
}
