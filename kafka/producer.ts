import { Kafka, logLevel, Partitioners, Producer } from "kafkajs";

const kafka = new Kafka({
  clientId: "order-service-producer",
  brokers: ["localhost:9092"],
  logLevel: logLevel.ERROR,
});

const TOPIC_NAME = "orders";

async function createProducer(): Promise<Producer> {
  const producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner,
  });

  await producer.connect();
  console.log("Kafka Producer connected");
  return producer;
}

async function sendOrderEvent(producer: Producer, order: Order): Promise<void> {
  await producer.send({
    topic: TOPIC_NAME,
    messages: [
      {
        key: order.customerId,
        value: JSON.stringify(order),
        headers: {
          "event-type": "order.created",
          "source-service": "order-service",
          "schema-version": "1",
        },
      },
    ],
  });

  console.log(
    ` Sent order [${order.orderId} for customer [${order.customerId}]]`,
  );
  console.log(`Total: R$${(order.totalInCents / 100).toFixed(2)}`);
}

async function main(): Promise<void> {
  const producer = await createProducer();

  try {
    console.log(`Sending 5 orders to Kafka topic "${TOPIC_NAME}...`);

    for (let i = 0; i < 5; i++) {
      const order = createSampleOrder();
      await sendOrderEvent(producer, order);

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`All orders  sent successfully`);
  } finally {
    await producer.disconnect();
    console.log("Producer disconnected");
  }
}

main().catch(console.error);
