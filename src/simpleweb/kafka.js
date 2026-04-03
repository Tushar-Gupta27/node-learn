const { Kafka, ConfigResourceTypes } = require("kafkajs");

// Create the client with the broker list
const kafka = new Kafka({
  clientId: "simpleweb",
  brokers: ["localhost:9093"],
});

class Producer {
  constructor(topic) {
    this.topic = topic;
    this.producer = kafka.producer();
    this.isConnected = false;
  }

  async init() {
    try {
      await this.producer.connect();
      this.isConnected = true;
    } catch (err) {
      console.log("producer init error", err);
      this.isConnected = false;
    }
  }
  async send(messages) {
    if (!this.isConnected) {
      await this.init();
    }
    const res = await this.producer.send({
      topic: this.topic,
      messages: messages,
    });
    console.log("producer sent", res);
  }
  async disconnect() {
    await this.producer.disconnect();
    this.isConnected = false;
  }
}

class Consumer {
  constructor(topic, group_id = "", autoCommit = true) {
    this.topic = topic;
    this.consumer = kafka.consumer({
      groupId: group_id ? group_id : "simpleweb-consumer",
    });
    this.isConnected = false;
    this.autoCommit = autoCommit;
  }

  async init() {
    try {
      await this.consumer.connect();
      this.isConnected = true;
    } catch (err) {
      console.log("consumer init error", err);
      this.isConnected = false;
    }
  }
  async start() {
    if (!this.isConnected) {
      await this.init();
    }
    await this.consumer.subscribe({
      topics: [this.topic],
      fromBeginning: false,
    });
    let once = false;
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message, heartbeat, pause }) => {
        console.log({
          key: message?.key?.toString() || "",
          value: message.value.toString(),
          partition: partition,
          topic: topic,
          headers: message.headers,
          message,
        });
        if (once) {
          console.log("committing offset", {
            value: message.value.toString(),
            offset: message.offset,
          });
          await this.consumer.commitOffsets([
            { topic, partition, offset: Number(message.offset) + 1 },
          ]);
          return (once = false);
        }
      },
      autoCommit: this.autoCommit,
    });
  }
  async startBatch() {
    if (!this.isConnected) {
      await this.init();
    }
    await this.consumer.subscribe({
      topics: [this.topic],
      fromBeginning: true,
    });
    await this.consumer.run({
      eachBatch: async ({ batch, uncommittedOffsets }) => {
        for (let message of batch.messages) {
          console.log({
            key: message?.key?.toString() || "",
            value: message.value.toString(),
            partition: batch.partition,
            topic: batch.topic,
            headers: message.headers,
            offset: message.offset,
            message,
          });
          console.log("UncommitedOffsets", uncommittedOffsets());
        }
      },
      autoCommit: this.autoCommit,
    });
  }
}

class Admin {
  constructor() {
    this.admin = kafka.admin();
    this.isConnected = false;
  }
  async init() {
    try {
      await this.admin.connect();
      this.isConnected = true;
    } catch (err) {
      console.log("admin init error", err);
      this.isConnected = false;
    }
  }
  async createTopic(
    topic = "simpleweb",
    numPartitions = 1,
    replicationFactor = 1
  ) {
    if (!this.isConnected) {
      await this.init();
    }
    await this.admin.createTopics({
      topics: [
        {
          topic: topic,
          numPartitions: numPartitions,
          replicationFactor: replicationFactor,
        },
      ],
    });
    console.log("topic created");
    this.admin.disconnect();
    this.isConnected = false;
  }

  async fetchMetaData() {
    const data = await this.admin.fetchTopicMetadata({
      topics: ["Users", "simpleweb"],
    });
    console.log("topicMetadata", JSON.stringify(data));
    data["topics"].forEach((each) =>
      console.log(each["name"], each["partitions"])
    );
  }
  async createPartitions() {
    const res = await this.admin.createPartitions({
      topicPartitions: [{ topic: "Users", count: 4 }],
    });
    console.log("createPartitions", res);
  }
  async getOffsetDataByTopic(topic) {
    const res = await this.admin.fetchTopicOffsets(topic);
    console.log("getOffsetDataByTopic", res);
  }

  async getAllOffsets() {
    const res = await this.admin.fetchOffsets({
      groupId: "simpleweb-only-consumer",
    });
    console.log(
      "getAllOffsets",
      res.map((e) => e.partitions)
    );
  }
  async getAllConfigs() {
    const res = await this.admin.describeConfigs({
      includeSynonyms: false,
      resources: [
        {
          type: ConfigResourceTypes.TOPIC,
          name: "simpleweb",
        },
        //can use this to get all available configs & then can specify a config name to get that only
      ],
    });
    console.log("getAllConfigs", JSON.stringify(res));
  }
}

module.exports = { Producer, Consumer, Admin };
