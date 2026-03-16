import amqplib, { ChannelModel, Channel } from "amqplib";
import { createSampleOrder, Order } from "../shared/types";

const RABBITMQ_URL = "amqp://guest:guest@localhost:5672";
const EXCHANGE_NAME = "orders.exchange";
const ROUTING_KEY = "order.created";
const QUEUE_NAME = "orders.fulfillment";

async function setupRabbitMQ(channel: Channel): Promise<void> {
  await channel.assertExchange(EXCHANGE_NAME, "direct", { durable: true });

  await channel.assertQueue(QUEUE_NAME, {
    durable: true,
  });

  await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

  console.log(`Exchange "${EXCHANGE_NAME}" and queue "${QUEUE_NAME} ready`);
}

function publishOrder(channel: Channel, order: Order): boolean {
  const messageBuffer = Buffer.from(JSON.stringify(order));

  const success = channel.publish(EXCHANGE_NAME, ROUTING_KEY, messageBuffer, {
    persistent: true,
    contentType: "application/json",
    contentEncoding: "utf-8",
    correlationId: order.orderId,
    headers: {
      "event-type": "order.created",
      "source-service": "order-service",
    },
  });

  if (!success) {
    console.warn(`Write buffer full - consider handling back-pressure`);
  }

  return success;
}

async function main(): Promise<void> {
  let connection: ChannelModel | null = null;

  try {
    connection = await amqplib.connect(RABBITMQ_URL);
    console.log("Connected to RabbitMQ");

    const channel = await connection.createChannel();

    await setupRabbitMQ(channel);

    console.log(`\n Sending 5 orders to exchange "${EXCHANGE_NAME}"...\n`);

    for (let i = 0; i < 5; i++) {
      const order = createSampleOrder();
      publishOrder(channel, order);
      console.log(
        `Puslished order [${order.orderId}] -> routing key: ${ROUTING_KEY}`,
      );
      console.log(
        `Customer: ${order.customerId} | Total: R$${(order.totalInCents / 100).toFixed(2)}`,
      );

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log("\n All orders published!");

    await new Promise((resolve) => setTimeout(resolve, 500));
    await channel.close();
  } finally {
    if (connection) {
      await connection.close();
      console.log(`RabbitMQ connection closed`);
    }
  }
}

main().catch(console.error);
