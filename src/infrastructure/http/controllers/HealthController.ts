import { Controller, Get } from '@nestjs/common';
import { IQueueProvider } from '@domain/queue/interfaces/IQueueProvider';

@Controller('health')
export class HealthController {
  constructor(private readonly queueProvider: IQueueProvider) {}

  @Get()
  async check(): Promise<{
    status: string;
    queue: { name: string; healthy: boolean };
  }> {
    const healthy = await this.queueProvider.healthCheck();
    return {
      status: healthy ? 'ok' : 'degraded',
      queue: {
        name: this.queueProvider.name,
        healthy,
      },
    };
  }
}
