import amqplib, { ChannelModel, Channel, ConsumeMessage } from "amqplib";
import { Order } from "../shared/types";

const RABBITMQ_URL = "amqp://guest:guest@localhost:5672";
const EXCHANGE_NAME = "orders.exchange";
const ROUTING_KEY = "order.created";
const QUEUE_NAME = "orders.fulfillment";

async function setupRabbitMQ(channel: Channel): Promise<void> {
  await channel.assertExchange(EXCHANGE_NAME, "direct", { durable: true });
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

  await channel.prefetch(1);
  console.log(`RabbitMQ setup complete`);
}

async function fulfillOrder(order: Order): Promise<void> {
  console.log(`[fulfillment-service] Fulfilling order ${order.orderId}`);
  console.log(`Customer: ${order.customerId}`);
  console.log(`Items: ${order.items.map((i) => i.name).join(", ")}`);
  console.log(`Total: R$${(order.totalInCents / 100).toFixed(2)}`);

  await new Promise((resolve) => setTimeout(resolve, 400));

  if (Math.random() < 0.1) {
    throw new Error(`Warehouse API timeout - temporary failure`);
  }

  console.log(`Order ${order.orderId} fulfilled successfully`);
}

async function handleMessage(
  channel: Channel,
  msg: ConsumeMessage,
): Promise<void> {
  const rawContent = msg.content.toString();
  const eventType = msg.properties.headers?.["event-type"];
  const correlationId = msg.properties.correlationId;

  console.log(
    `\n Received message | CorrelationId: ${correlationId} | Event: ${eventType}`,
  );

  let order: Order;

  try {
    order = JSON.parse(rawContent) as Order;
  } catch {
    console.error(`Failed to parse message JSON - discarding`);
    channel.nack(msg, false, false);
    return;
  }

  try {
    await fulfillOrder(order);

    channel.ack(msg);
  } catch (error) {
    console.error(
      `Failed to fulfill order ${order.orderId}:`,
      (error as Error).message,
    );

    channel.nack(msg, false, false);
    console.warn(`Message sent to dead letter exchange (if configured)`);
  }
}

async function startConsumer(channel: Channel): Promise<void> {
  await channel.consume(QUEUE_NAME, async (msg) => {
    if (!msg) {
      console.warn("Consumer cancelled by broker");
      return;
    }
    await handleMessage(channel, msg);
  });
  console.log(`\n Waiting for messages on queue "${QUEUE_NAME}"...`);
  console.log(`Press CTRL+C to stop\n`);
}

async function main(): Promise<void> {
  let connection: ChannelModel | null = null;

  connection = await amqplib.connect(RABBITMQ_URL);
  console.log("Connected to RabbitMQ");

  const channel = await connection.createChannel();
  await setupRabbitMQ(channel);
  await startConsumer(channel);

  const shutdown = async () => {
    console.log(`\n Shutting down...`);
    try {
      await channel.close();
      if (connection) await connection.close();
    } catch {}
    process.exit(0);
  };

  connection.on("error", (err) => {
    console.error("RabbitMQ connection error:", err.message);
    process.exit(1);
  });

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch(console.error);
