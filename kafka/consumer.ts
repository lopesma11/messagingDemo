import { Consumer, EachMessagePayload, Kafka, logLevel } from "kafkajs";
import { Order } from "../shared/types";

const kafka = new Kafka({
  clientId: "fulfillment-service-consumer",
  brokers: ["localhost:9092"],
  logLevel: logLevel.ERROR,
});

const TOPIC_NAME = "orders";
const GROUP_ID = "fullfillment-service";

async function processOrder(order: Order): Promise<void> {
  console.log(`\n [fulfillment-service] Processing order ${order.orderId}`);
  console.log(`Customer: ${order.customerId}`);
  console.log(`Items: ${order.items.map((i) => i.name).join(", ")}`);
  console.log(`Total: R$${(order.totalInCents / 100).toFixed(2)}`);

  await new Promise((resolve) => setTimeout(resolve, 300));

  console.log(` Order ${order.orderId} queued for fulfillment`);
}

async function handleMessage({
  topic,
  partition,
  message,
}: EachMessagePayload): Promise<void> {
  const rawValue = message.value?.toString();
  if (!rawValue) {
    console.warn(`Received empty message, skipping`);
    return;
  }

  const offset = message.offset;
  const eventType = message.headers?.["event-type"]?.toString();

  console.log(
    `\n Received message | Topic ${topic} | Partition: ${partition} | Offset: ${offset}`,
  );
  console.log(`Event Type: ${eventType}`);

  try {
    const order = JSON.parse(rawValue) as Order;
    await processOrder(order);
  } catch (error) {
    console.error(`Failed to process message at offset ${offset}:`, error);
  }
}

async function startConsumer(): Promise<Consumer> {
  const consumer = kafka.consumer({
    groupId: GROUP_ID,
  });

  await consumer.connect();
  console.log(`Consumer connected | Group: ${GROUP_ID}`);

  await consumer.subscribe({
    topic: TOPIC_NAME,
    fromBeginning: true,
  });

  await consumer.run({
    eachMessage: handleMessage,
  });

  return consumer;
}

async function main(): Promise<void> {
  console.log(
    `\n Starting Kafka consumer for topic "${TOPIC_NAME}" (group: ${GROUP_ID})...\n `,
  );

  const consumer = await startConsumer();

  const shutdown = async () => {
    console.log("\n Shutting down consumer...");
    await consumer.disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch(console.error);
