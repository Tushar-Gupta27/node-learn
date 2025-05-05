const { Producer } = require("./kafka");

const kafkaProducer = new Producer("Users");

const msg = process.argv[2];
//A-M ->0, N-Z->1
kafkaProducer
  .send([{ value: msg, partition: msg[0].toLowerCase() < "n" ? 0 : 1 }])
  .then((d) => {
    kafkaProducer.disconnect();
    process.exit(0);
  });
