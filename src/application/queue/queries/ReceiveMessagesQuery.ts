export class ReceiveMessagesQuery {
  constructor(
    public readonly queueName: string,
    public readonly maxMessages?: number,
  ) {}
}
