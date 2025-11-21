import { QueueMessage } from './QueueMessage';

describe('QueueMessage', () => {
  describe('create', () => {
    it('should create a message with generated id', () => {
      const message = QueueMessage.create('test-queue', { data: 'test' });

      expect(message.id).toBeDefined();
      expect(message.queueName).toBe('test-queue');
      expect(message.payload).toEqual({ data: 'test' });
      expect(message.createdAt).toBeInstanceOf(Date);
    });

    it('should create a message with attributes', () => {
      const attributes = { priority: 'high' };
      const message = QueueMessage.create('test-queue', 'payload', attributes);

      expect(message.attributes).toEqual(attributes);
    });

    it('should generate unique ids for each message', () => {
      const message1 = QueueMessage.create('queue', 'payload1');
      const message2 = QueueMessage.create('queue', 'payload2');

      expect(message1.id).not.toBe(message2.id);
    });
  });

  describe('constructor', () => {
    it('should create a message with all properties', () => {
      const message = new QueueMessage(
        'custom-id',
        'my-queue',
        { key: 'value' },
        { attr: 'test' },
        'receipt-123',
        new Date('2024-01-01'),
      );

      expect(message.id).toBe('custom-id');
      expect(message.queueName).toBe('my-queue');
      expect(message.payload).toEqual({ key: 'value' });
      expect(message.attributes).toEqual({ attr: 'test' });
      expect(message.receiptHandle).toBe('receipt-123');
      expect(message.createdAt).toEqual(new Date('2024-01-01'));
    });
  });
});
