const { Consumer } = require("./kafka");

const consumer = new Consumer("simpleweb", "simpleweb-only-consumer", false);
consumer.start();
// const userConsumer = new Consumer("Users", "user-consumer");
// userConsumer.start();

//when starting consumer, if there is not topic, it will throw error
//so either start it after producer is started
//OR
//can maybe setup an admin which will set all topics
