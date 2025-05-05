//IMP WONT RUN
process.env.NODE_CONFIG_DIR = `${__dirname}/../../../../../config`;
const moment = require("moment");
const config = require("config");
const { Consumer } = require("../../../../commons/kafka/index");
const { sendJobStatusToSlack } = require("../../../../commons/Slack");
const SlackMessage = require("../../../../commons/notification/slackMessage");
const Logger = require("../../../../commons/logger").logger;

const slackMessage = new SlackMessage({
  channelUrl: config.get("KAFKA_MONITORING_ALERTS_SLACK_WEBHOOK"),
});

const setStatus = (serviceName, status, strtTime, e) =>
  sendJobStatusToSlack(
    serviceName,
    status,
    strtTime ? moment.duration(Date.now() - strtTime).humanize() : undefined,
    e
  );

const isProd = config.get("APP_ENV") == "production";

const genericDelayConsumer = async (Handler) => {
  let nextTrigger;
  const strtTime = Date.now();
  const handler = new Handler();
  try {
    const groupId = `${handler.serviceName}-delay-queue-processor${
      isProd ? "" : "-dev"
    }`;
    const consumer = new Consumer(
      config.get("KAFKA_BROKERS"),
      handler.consumeFromTopic,
      groupId,
      true
    );

    await setStatus(handler.serviceName, "STARTED");
    await consumer.connect();
    let isDelayCheck = false;
    let delayDetails = {};
    const logger = Logger.child({
      serviceName: handler.serviceName,
    });
    let messagesProcessed = 0;
    let skippedMessages = 0;
    const commitSkippedMessagesMin = handler.commitSkippedMessagesMin || 100;

    consumer.on(consumer.events.CRASH, async (e) => {
      console.error(`[consumer.CRASHED] ${e.payload.error.message}`, e);
      if (!e.payload.restart) {
        console.error("Consumer is not restarting");
        await slackMessage.sendMarkdown(
          "Topic: " +
            handler.consumeFromTopic +
            ". Consumer: " +
            groupId +
            "\n" +
            "Consumer crashed. Error: " +
            e.payload.error.message +
            "\n" +
            "Consumer is not restarting. So, pod restarted"
        );
        process.exit(1);
      } else if (e.payload.restart) {
        console.error("Consumer is crashed and restarting");
        await slackMessage.sendMarkdown(
          "Topic: " +
            handler.consumeFromTopic +
            ". Consumer: " +
            groupId +
            "\n" +
            "Consumer crashed. Error: " +
            e.payload.error.message +
            "\n" +
            "Consumer is restarting"
        );
      }
    });

    consumer.on(consumer.events.END_BATCH_PROCESS, async (payload) => {
      if (isDelayCheck && delayDetails.partition == payload.payload.partition) {
        logger.info(
          "batch processing ended for partition: " + payload.payload.partition
        );
        await consumer.disconnect();
        await setStatus(handler.serviceName, "COMPLETED", strtTime);
        const resumesAfterMs = delayDetails.processAt
          .clone()
          .subtract(moment())
          .valueOf();
        logger.info(
          `function executes again after: ${moment
            .duration(resumesAfterMs)
            .humanize()}`
        );
        /* 4 timeout's getting created. probably this function runs parellely for all batch end events. So, Singularity implemented */
        if (nextTrigger) clearTimeout(nextTrigger);
        nextTrigger = setTimeout(genericDelayConsumer, resumesAfterMs, Handler);
        await handler.shutdown();
        isDelayCheck = false;
      }
    });

    /* DB Query is taking around 4-5mins and when it's part of the events, it's causing consumer-id to timeout as sessionTimeout is 30 seconds. */
    await handler.init({ logger });
    // await mapCmoCxToClAfterDelay1Hour.init();
    // if(typeof initiateBeforeStartingConsumer == 'function') initiateBeforeStartingConsumer();

    await consumer.readEachMessage(async ({ topic, partition, message }) => {
      try {
        if (isDelayCheck) {
          logger.info(
            "skipping offset: " + message.offset + " will resume later"
          );
          return;
        }
        let data = JSON.parse((message.value || "").toString());

        if (!(await handler.isInputValid(data))) {
          skippedMessages++;
          if (skippedMessages >= commitSkippedMessagesMin) {
            skippedMessages = 0;
            await consumer.commitOffsets(
              partition,
              (Number(message.offset) + 1).toString()
            );
          }
          return;
        }

        const type = data.type;
        const payload = data.payload;
        logger.info(
          `partition: ${partition}. offset: ${
            message.offset
          }. message: ${JSON.stringify(payload)}`
        );
        logger.info(
          `message timestamp: ${moment(
            payload[handler.delayFieldKey]
          ).toDate()}`
        );
        const isDelayed = moment(payload[handler.delayFieldKey])
          .add(...handler.delayPeriod)
          .isBefore(moment());

        if (!payload[handler.delayFieldKey]) {
          logger.info(
            `message does not have ${handler.delayFieldKey} field. So, processing it immediately`
          );
        }

        if (!payload[handler.delayFieldKey] || isDelayed) {
          messagesProcessed++;
          await handler.processEvent(type, payload);
          await consumer.commitOffsets(
            partition,
            (Number(message.offset) + 1).toString()
          );
          return;
        }

        /* else -> delay the message until handler.delayPeriod */
        let processAt = moment(payload[handler.delayFieldKey])
          .add(...handler.delayPeriod)
          .add(1, "minute");

        // if processAt is after 10pm today and before 7am tomorrow, then set processAt as 7.01 am tomorrow

        processAt = await handler.adjustDelay(processAt);
        logger.info(
          `processed ${messagesProcessed}. will resume at: ${processAt}`
        );
        delayDetails = { partition, offset: message.offset, processAt };

        // if current event is 5th message, this commits till the 4th one. .i.e., when the consumer starts again, it will process 5th one as it was skipped processing before, due to delay.
        await consumer.commitOffsets(
          partition,
          Number(message.offset).toString()
        );
        logger.info(
          `committed partition: ${partition}. offset: ${message.offset}`
        );

        isDelayCheck = true;
      } catch (e) {
        logger.error(
          "genericDelayConsumer Error: " + handler.serviceName + " " + e.message
        );
        logger.error(e);
      }
    }, false);
  } catch (e) {
    console.error(
      "genericDelayConsumer Error: " + handler.serviceName + " " + e.message
    );
    console.error(e);
    await setStatus(handler.serviceName, "FAILED", strtTime, e);
    console.error(
      "genericDelayConsumer Exiting Pod as consumer failed to start"
    );
    process.exit(1);
  }
};

module.exports = genericDelayConsumer;
