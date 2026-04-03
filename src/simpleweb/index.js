const express = require("express");
const pgp = require("pg-promise")();
const app = express();
const { logger, loggerMW } = require("./logger");
const util = require("util");
// console.log = function () {
//   logger.info.apply(logger, [
//     util.format.apply(util.format, Array.prototype.slice.call(arguments)),
//   ]);
// };
// console.log = function () {
//can add TRACEID like this by changing the console.log function
//   logger.info.apply(logger, [Object.values(arguments)]);
// };
let db = null;
let counter = 0;
const os = require("os");
const cpuCount = os.cpus().length;
const { Producer, Admin } = require("./kafka");
const kafkaProducer = new Producer("transactional_messages");
const kafkaAdmin = new Admin();
// kafkaAdmin.getAllConfigs();
// kafkaAdmin.fetchMetaData();
app.use(loggerMW);
//can use multi .env files like this if using dotenv package
// require("dotenv").config({ path: "./.env.staging" });
console.log(cpuCount);
let prevTime = 0;
let simul = 0;
//a retry logic for db connection, waits for 3000 once failed
const retries = 5;
while (retries) {
  try {
    //can use db as hostname here, as its in the same network with our nodeJS app
    db = pgp("postgres://postgres:postgres@db/dummydb");
    break;
  } catch (err) {
    console.log("simpleweb err", err);
    retries--;
    console.log("retries", retries);
    //other sleep logic coz in older node versions, cant use await without async function
    // await new Promise((res, rej) => setTimeout(res, 3000));
  }
}
console.log(process.env.TEST2);
// console.log("db", db);
app.use(function (req, res, next) {
  console.log("middleware 1");
  next();
});

app.get("/", (req, res, next) => {
  // let { body, query, path, method, baseUrl } = req;
  // console.log("req", body, query, path, method, baseUrl);
  res.send("Hi there");
  // res.body = "Hi there";
  // next();
});
//commented out this middleware for now
//if we add a middleware at the end of the code, then we can use it to send the final responses rather than return from each API
//same for error handling
// app.use(function (req, res, next) {
//   console.log("middleware 2");
//   return res.send(res.body || "Nobody");
//   // next();
// });

app.get("/names", async (req, res) => {
  const names = await db.any("SELECT * FROM newtable");
  res.send(JSON.stringify(names));
});

app.get("/fourhundred", (req, res) => {
  return res.status(400).json({ message: "errorhehehe" });
});

app.get("/console/:value", (req, res) => {
  console.log("LOGGER", req.params.value);
  return res.send(req.params.value);
});

app.get("/sleeper", async (req, res) => {
  const curr = Date.now();
  ++simul;
  console.log(
    "received req at",
    curr,
    "req number",
    counter++,
    "time ",
    curr - prevTime,
    "simul",
    simul
  );
  prevTime = curr;
  const start = Date.now();
  const result = await new Promise((res, rej) =>
    setTimeout(() => {
      --simul;
      res(`slept ${Date.now() - start}ms`);
    }, 3000)
  );
  console.log("simul after promise", simul);
  return res.send(result);
});
function sleep(delay) {
  var start = new Date().getTime();
  while (new Date().getTime() < start + delay);
}
app.get("/sleeper2", async (req, res) => {
  const curr = Date.now();
  console.log("received req at", curr, "req number", counter++);
  sleep(10000);
  return res.send("done");
});

app.get("/produce", async (req, res) => {
  console.log("/producer", req.query.key, req.query.value);
  //in each message, the value key is necessary
  kafkaProducer.send([{ value: req.query.value }]);
  console.log("/producer produced");
  return res.status(200).json({
    key: req.query.key,
    value: req.query.value,
  });
});
app.get("/produce-2", async (req, res) => {
  console.log("/producer-2", req.query.key, req.query.value);
  //in each message, the value key is necessary
  kafkaProducer.send([
    req.query.recon === "true"
      ? {
          value: JSON.stringify({
            type: "RECON_COMPLETED",
            payload: {
              cp_id: "cp-1",
              cp_db_id: "cp-db-1",
              ofd_date: "2025-09-16",
            },
          }),
        }
      : {
          value: JSON.stringify({
            type: "RECON_NOT_COMPLETED",
            payload: {
              cp_id: "cp-1",
              cp_db_id: "cp-db-1",
              ofd_date: "2025-09-16",
            },
          }),
        },
  ]);
  console.log("/producer-2 produced");
  return res.status(200).json({
    key: req.query.key,
    value: req.query.value,
  });
});
app.listen(5001, () => {
  console.log("Listening on port 5000");
});
