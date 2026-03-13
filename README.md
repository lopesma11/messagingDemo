# Messaging Demo: Kafka vs RabbitMQ

A hands-on comparison of Kafka and RabbitMQ using an order processing scenario.

## Project Structure

```
messaging-demo/
├── shared/
│   └── types.ts          # Shared business types (Order, OrderItem, etc.)
├── kafka/
│   ├── producer.ts       # Publishes order events to a Kafka topic
│   └── consumer.ts       # Consumes order events with consumer group
├── rabbitmq/
│   ├── producer.ts       # Publishes orders via Exchange → Queue
│   └── consumer.ts       # Consumes with manual ACK/NACK
├── docker-compose.yml    # RabbitMQ + Kafka + UIs
└── README.md
```

## Quick Start

### 1. Start the brokers

```bash
docker-compose up -d

# Wait ~15s for services to be healthy, then verify:
docker-compose ps
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run RabbitMQ demo

**Terminal 1 — Consumer (start first):**

```bash
npm run rabbit:consumer
```

**Terminal 2 — Producer:**

```bash
npm run rabbit:producer
```

### 4. Run Kafka demo

**Terminal 1 — Consumer:**

```bash
npm run kafka:consumer
```

**Terminal 2 — Producer:**

```bash
npm run kafka:producer
```

## 🔍 Useful UIs

| Service     | URL                    | Credentials   |
| ----------- | ---------------------- | ------------- |
| RabbitMQ UI | http://localhost:15672 | guest / guest |
| Kafka UI    | http://localhost:8080  | (none needed) |

## Core Concepts Compared

| Concept          | RabbitMQ                          | Kafka                                      |
| ---------------- | --------------------------------- | ------------------------------------------ |
| Message fate     | Deleted after ACK                 | Retained for configured retention time     |
| Routing          | Exchange + binding rules          | Topics + partitions                        |
| Multiple readers | Fan-out exchange (broadcast)      | Different consumer groups (each gets all)  |
| Ordering         | Per-queue (single consumer)       | Per-partition (within consumer group)      |
| Scaling          | Add consumers to same queue       | Add consumers to same group (≤ partitions) |
| Replay events    | Not possible (gone after ACK)     | Yes! Seek to any offset and re-read        |
| Best for         | Task queues, RPC, complex routing | Event streaming, audit logs, analytics     |

## Experiment Ideas

1. **Scale RabbitMQ workers**: Open two terminals and run `rabbit:consumer` in both.
   Watch how RabbitMQ distributes messages between them (round-robin by default).

2. **Multiple Kafka consumer groups**: Run two consumers with different `GROUP_ID` values.
   Both will receive ALL messages — this is how multiple microservices react to the same event.

3. **Kafka replay**: Stop the Kafka consumer, run the producer 3 more times, then restart
   the consumer with `fromBeginning: true`. It will process ALL historical messages.

4. **RabbitMQ management UI**: Go to http://localhost:15672, click "Queues",
   find `orders.fulfillment` and try publishing/getting messages manually.
