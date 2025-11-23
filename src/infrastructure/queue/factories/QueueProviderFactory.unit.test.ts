import { QueueProviderFactory } from './QueueProviderFactory';
import { BullMqProvider } from '../providers/BullMqProvider';
import { RabbitMqProvider } from '../providers/RabbitMqProvider';
import { CompositeQueueProvider } from '../providers/CompositeQueueProvider';

describe('QueueProviderFactory', () => {
  let factory: QueueProviderFactory;
  let mockBullMqProvider: jest.Mocked<BullMqProvider>;
  let mockRabbitMqProvider: jest.Mocked<RabbitMqProvider>;

  beforeEach(() => {
    mockBullMqProvider = { name: 'bullmq' } as any;
    mockRabbitMqProvider = { name: 'rabbitmq' } as any;

    factory = new QueueProviderFactory(
      mockBullMqProvider,
      mockRabbitMqProvider,
    );
  });

  it('should return BullMqProvider when providerType is "bullmq"', () => {
    const result = factory.create('bullmq');

    expect(result).toBe(mockBullMqProvider);
    expect(result.name).toBe('bullmq');
  });

  it('should return RabbitMqProvider when providerType is "rabbitmq"', () => {
    const result = factory.create('rabbitmq');

    expect(result).toBe(mockRabbitMqProvider);
    expect(result.name).toBe('rabbitmq');
  });

  it('should return CompositeQueueProvider when "both" is specified', () => {
    const provider = factory.create('both');
    expect(provider).toBeInstanceOf(CompositeQueueProvider);
  });

  it('should throw error for unknown provider type', () => {
    expect(() => factory.create('unknown')).toThrow(
      'Unknown queue provider: unknown',
    );
  });
});
