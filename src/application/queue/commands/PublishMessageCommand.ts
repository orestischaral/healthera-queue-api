export class PublishMessageCommand {
  constructor(
    public readonly queueName: string,
    public readonly payload: unknown,
    public readonly attributes?: Record<string, string>,
  ) {}
}
