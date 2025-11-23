# Healthera Queue API

A NestJS API with **swappable queue implementations** (BullMQ/RabbitMQ). Switch between providers without code changes—just change an environment variable.

## Features

- **Swappable Providers** - BullMQ (Redis) or RabbitMQ via environment variable
- **Clean Architecture** - Onion Architecture + DDD principles
- **CQRS Pattern** - Clear separation of commands and queries
- **Event-Driven Notifications** - Automatic notifications on message publish
- **Dual Consumption Patterns** - Polling (REST) and event-driven (subscription)
- **Production-Ready** - Error handling, health checks, Docker support
- **Comprehensive Tests** - Unit and E2E tests (both providers)

## Quick Start

```bash
# Install
npm install
# Start infrastructure
docker-compose up -d redis rabbitmq
# Run locally
npm run start:dev
# Run everything in Docker
docker-compose up
```

## Switching Providers

```bash
# BullMQ (default)
QUEUE_PROVIDER=bullmq npm run start:dev
# RabbitMQ
QUEUE_PROVIDER=rabbitmq npm run start:dev
```

## API Endpoints

| Method | Endpoint                                | Description         |
| ------ | --------------------------------------- | ------------------- |
| POST   | `/queues`                               | Create queue        |
| DELETE | `/queues/:name`                         | Delete queue        |
| POST   | `/queues/:name/messages`                | Publish message     |
| GET    | `/queues/:name/messages`                | Receive messages    |
| DELETE | `/queues/:name/messages/:receiptHandle` | Acknowledge message |
| GET    | `/health`                               | Health check        |

### Example Usage

```bash
# Create queue
curl -X POST http://localhost:3000/queues \
  -H "Content-Type: application/json" \
  -d '{"name": "orders"}'

# Publish message (triggers notification automatically)
curl -X POST http://localhost:3000/queues/orders/messages \
  -H "Content-Type: application/json" \
  -d '{"payload": {"id": 1, "status": "pending"}}'

# Receive messages
curl http://localhost:3000/queues/orders/messages?maxMessages=10

# Acknowledge message
curl -X DELETE http://localhost:3000/queues/orders/messages/receipt-xyz
```

## Event-Driven Notification Flow

When a message is published, the system automatically:

1. **PublishMessageHandler** (CQRS) processes the publish command
2. **NotificationService** creates a notification message
3. Notification is published to `notifications` queue
4. **NotificationSubscriber** receives it (listening at startup)
5. **ProcessNotificationHandler** (CQRS) logs the notification

```
User publishes message
    ↓
PublishMessageHandler (Command)
    ↓
NotificationService orchestrates
    ↓
Notification published to queue
    ↓
NotificationSubscriber (Event Listener)
    ↓
ProcessNotificationCommand (CQRS)
    ↓
ProcessNotificationHandler logs output
```

## Testing

```bash
# All tests
npm test
# Unit tests only
npm test -- --testPathPattern=unit.test
# E2E tests (parametrized for both providers)
npm test -- --testPathPattern=e2e.test
```

**Test Coverage:**

- `QueueMessage.unit.test.ts` - Entity logic
- `BullMqProvider.unit.test.ts` - BullMQ implementation
- `RabbitMqProvider.unit.test.ts` - RabbitMQ implementation + retry logic
- `QueueProviderFactory.unit.test.ts` - Provider selection
- `*Controller.e2e.test.ts` - Full API tests (runs with both providers)

## Architecture

```
┌─────────────────────────────────────────┐
│     Infrastructure Layer (Controllers)   │
│  + NotificationSubscriber (Queue Listener)|
├─────────────────────────────────────────┤
│   Application Layer (CQRS Handlers)      │
│  + NotificationService (Orchestrator)    │
│  + ProcessNotificationHandler            │
├─────────────────────────────────────────┤
│   Domain Layer (Entities, Interfaces)    │
│  + IQueueProvider, INotificationService  │
└─────────────────────────────────────────┘
```

**Dependency Rule:** Inner layers have no knowledge of outer layers.

## Project Structure

```
src/
├── domain/                      # Core business logic
│   ├── queue/
│   │   ├── entities/           # QueueMessage
│   │   ├── interfaces/         # IQueueProvider
│   │   └── exceptions/         # Domain exceptions
│   └── notification/
│       └── interfaces/         # INotificationService
├── application/                 # Use cases (CQRS)
│   ├── queue/
│   │   ├── commands/           # PublishMessage, CreateQueue, etc.
│   │   └── queries/            # ReceiveMessages
│   └── notification/
│       ├── commands/           # ProcessNotificationCommand
│       │   └── ProcessNotificationHandler
│       └── NotificationService # Notification orchestrator
└── infrastructure/              # Adapters
    ├── queue/
    │   ├── providers/          # BullMqProvider, RabbitMqProvider
    │   └── factories/          # QueueProviderFactory
    ├── notification/
    │   ├── NotificationSubscriber # Queue listener
    │   └── NotificationModule     # Module definition
    ├── http/
    │   ├── controllers/        # REST endpoints
    │   ├── dto/                # Request/response objects
    │   └── filters/            # Exception handling
    └── config/                 # Configuration from env vars
```

## Environment Variables

| Variable                  | Description                      | Default                           |
| ------------------------- | -------------------------------- | --------------------------------- |
| `PORT`                    | HTTP port                        | 3000                              |
| `QUEUE_PROVIDER`          | Provider: `bullmq` or `rabbitmq` | bullmq                            |
| `REDIS_HOST`              | Redis hostname                   | localhost                         |
| `REDIS_PORT`              | Redis port                       | 6379                              |
| `RABBITMQ_URL`            | RabbitMQ connection URL          | amqp://guest:guest@localhost:5672 |
| `RABBITMQ_RETRY_ATTEMPTS` | Connection retry attempts        | 5                                 |
| `RABBITMQ_RETRY_DELAY_MS` | Retry delay in ms                | 1000                              |

## Design Decisions

### 1. Onion Architecture

- **Why:** Domain logic independent of frameworks, easy to test, flexible to swap implementations
- **Layers:** Domain (core) → Application (use cases) → Infrastructure (adapters)

### 2. CQRS Pattern

- **Why:** Clear intent (write vs read), scalable, testable, single responsibility
- **Commands:** PublishMessage, CreateQueue, DeleteQueue, AcknowledgeMessage, **ProcessNotification**
- **Queries:** ReceiveMessages

### 3. Abstract Class for IQueueProvider & INotificationService

- **Why:** NestJS DI requires runtime tokens; interfaces are erased at compile time
- **Result:** Type-safe injection without `@Inject()` decorator

### 4. Dynamic Modules

- **Why:** Provider selection at runtime based on environment variable
- **Result:** Single compiled artifact works with any provider

### 5. Factory Pattern

- **Why:** Centralized logic for selecting and instantiating the correct provider
- **Result:** One place to manage provider creation; easy to add new providers

### 6. Event-Driven Notifications (NotificationSubscriber)

- **Why:** Decouple message publishing from notification processing
- **How:** Uses `OnModuleInit` to subscribe at startup, `OnModuleDestroy` for graceful shutdown
- **Result:** Automatic, scalable notification system without polling

### 7. NotificationModule Encapsulation

- **Why:** Separate concerns, clear module boundaries, reusable pattern
- **Contains:** NotificationService, ProcessNotificationHandler, NotificationSubscriber
- **Exports:** Only INotificationService (public API)
- **Result:** Can be imported by any module needing notifications

### 8. Dual Consumption Patterns

- **Polling:** REST API `/queues/:name/messages` - client-initiated
- **Event-Driven:** NotificationSubscriber - server-initiated at startup
- **Use Case:** Both patterns coexist; choose based on requirements

### 9. BullMQ over SQS

- **Why:**
  - Simpler local dev (just Redis container)
  - No emulator needed (SQS requires LocalStack)
  - Better NestJS integration
  - Extensible features (scheduling, priorities)

### 10. Parametrized E2E Tests

- **Why:** Ensures same API behavior regardless of provider
- **Result:** Each test runs with both BullMQ and RabbitMQ

## Development Notes

### Claude AI Contribution

Claude AI worked in a pair programming session. Discussed alternatives on design decisions and provided implementation support.

**Phases:**

1. **Planning Phase** - Initially operated under `plan mode`. Created an implementation plan based on the architectural decisions
2. **Implementation Phase** - Operated under `asks before edit`.

- Provided boilerplate code
- Provided explanation on NestJS concepts
- Implemented test files

4. **Documentation Phase** - Provided README with complete feature overview

**Key Design Discussions:**

- Application layer orchestration vs. infrastructure concerns
- CQRS pattern for all operations (including event handlers)
- Module encapsulation for notifications
- Interface vs. concrete class for dependency injection

---

## 👤 Author

#### Orestis Charalampakos

Software Engineer
