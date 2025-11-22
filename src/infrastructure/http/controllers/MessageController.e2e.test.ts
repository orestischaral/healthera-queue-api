import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../app.module';
import { DomainExceptionFilter } from '../filters/DomainExceptionFilter';

describe.each(['bullmq', 'rabbitmq'])(
  'MessageController with %s (e2e)',
  (provider) => {
    let app: INestApplication;
    const queueName = `msg-test${Math.floor(Math.random())}`;

    beforeAll(async () => {
      process.env.QUEUE_PROVIDER = provider;
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      app.useGlobalFilters(new DomainExceptionFilter());
      await app.init();

      // Create test queue
      await request(app.getHttpServer())
        .post('/queues')
        .send({ name: queueName });
    });

    afterAll(async () => {
      await app.close();
    });

    it('POST /:name/messages - should publish a message', async () => {
      const response = await request(app.getHttpServer())
        .post(`/queues/${queueName}/messages`)
        .send({ payload: { hello: 'world' } })
        .expect(201);

      expect(response.body).toHaveProperty('messageId');
      expect(typeof response.body.messageId).toBe('string');
    });

    it('GET /:name/messages - should receive messages', async () => {
      const response = await request(app.getHttpServer())
        .get(`/queues/${queueName}/messages`)
        .expect(200);

      expect(response.body).toHaveProperty('messages');
      expect(Array.isArray(response.body.messages)).toBe(true);
    });

    it('DELETE /:name/messages/:receiptHandle - should acknowledge message', async () => {
      // Publish a message
      await request(app.getHttpServer())
        .post(`/queues/${queueName}/messages`)
        .send({ payload: { test: 'data' } });

      // Receive it
      const receiveResponse = await request(app.getHttpServer()).get(
        `/queues/${queueName}/messages`,
      );

      const message = receiveResponse.body.messages[0];
      if (message) {
        const response = await request(app.getHttpServer())
          .delete(`/queues/${queueName}/messages/${message.receiptHandle}`)
          .expect(200);

        expect(response.body).toEqual({ acknowledged: true });
      }
    });
  },
);
