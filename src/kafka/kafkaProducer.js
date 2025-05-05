const { Kafka } = require("kafkajs");

// Create the client with the broker list
const kafka = new Kafka({
  clientId: "my-app",
  brokers: ["localhost:9093"],
});
const startProducer = async () => {
  const producer = kafka.producer();

  await producer.connect();
  await producer.send({
    topic: "kafka-try",
    messages: [
      { key: "key1", value: "hello world" },
      { key: "key2", value: "hey hey!" },
    ],
  });
};

const startConsumer = async () => {
  const consumer = kafka.consumer({ groupId: "my-group" });

  await consumer.connect();

  await consumer.subscribe({ topics: ["kafka-try"], fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message, heartbeat, pause }) => {
      console.log({
        key: message.key.toString(),
        value: message.value.toString(),
        headers: message.headers,
      });
    },
  });
};

startProducer()
startConsumer();
