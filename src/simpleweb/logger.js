const winston = require("winston");
const expressWinston = require("express-winston");

//Express winston automatically adds responseTime to logs
module.exports = {
  loggerMW: expressWinston.logger({
    transports: [new winston.transports.Console()],
    format: winston.format.combine(winston.format.json()),
    metaField: null, //this causes the metadata to be stored at the root of the log entry
    responseField: null,
    requestField: null,
    level: (_req, res) => {
      let level = "";
      if (res.statusCode >= 100) {
        level = "info";
      }
      if (res.statusCode >= 400) {
        level = "warn";
      }
      if (res.statusCode >= 500) {
        level = "error";
      }
      if (res.statusCode == 401 || res.statusCode == 403) {
        level = "warn";
      }
      return level;
    },
    meta: true, // optional: control whether you want to log the meta data about the request (default to true)
    msg: "{{req.method}} {{req.url}} {{res.statusCode}} {{res.responseSize}} {{res.responseTime}}ms",
    dynamicMeta: (req, res) => {
      const httpRequest = {};
      const meta = {};
      // adding any data to httpRequest allows it to be logged inside the response log -> so can add any userIds & leaderID cpdbId as we do in citymall
      if (req) {
        meta.httpRequest = httpRequest;
        httpRequest.requestMethod = req.method;
        httpRequest.requestUrl = `${req.protocol}://${req.get("host")}${
          req.originalUrl
        }`;
        httpRequest.protocol = `HTTP/${req.httpVersion}`;
        // httpRequest.remoteIp = req.ip // this includes both ipv6 and ipv4 addresses separated by ':'
        httpRequest.remoteIp =
          req.ip.indexOf(":") >= 0
            ? req.ip.substring(req.ip.lastIndexOf(":") + 1)
            : req.ip; // just ipv4
        httpRequest.requestSize = req.socket.bytesRead;
        httpRequest.userAgent = req.get("User-Agent");
        httpRequest.referrer = req.get("Referrer");
      }

      if (res) {
        meta.httpRequest = httpRequest;
        httpRequest.status = res.statusCode;
        httpRequest.latency = {
          seconds: Math.floor(res.responseTime / 1000),
          nanos: (res.responseTime % 1000) * 1000000,
        };
        if (res.body) {
          if (typeof res.body === "object") {
            httpRequest.responseSize = JSON.stringify(res.body).length;
          } else if (typeof res.body === "string") {
            httpRequest.responseSize = res.body.length;
          }
        }
      }
      return meta;
    },
  }),
  loggerMWWithoutPackage: (req, res, next) => {
    const httpRequest = {};
    httpRequest.requestMethod = req.method;
    httpRequest.requestUrl = `${req.protocol}://${req.get("host")}${
      req.originalUrl
    }`;
    httpRequest.endpointUrl = `${req.protocol}://${req.get("host")}${
      req.originalUrl.split("?")[0]
    }`;
    httpRequest.protocol = `HTTP/${req.httpVersion}`;
    // httpRequest.remoteIp = getRealIpFromCf(req) // this includes both ipv6 and ipv4 addresses separated by ':'
    httpRequest.correlationId = req.headers["x-request-id"] || "";
    httpRequest.remoteIp = getRealIpFromCf(req);
    httpRequest.requestSize = req.socket.bytesRead;
    httpRequest.userAgent = req.get("User-Agent");
    httpRequest.referrer = req.get("Referrer");
    httpRequest.appVersion = req.headers["x-app-version"] || ""; //
    httpRequest.appVersionCode = req.headers["x-app-version-code"] || ""; //

    if (req.teamLeader && req.teamLeader.id) {
      httpRequest.user_type = "LEADER";
      httpRequest.user_id = req.teamLeader.user_id;
      httpRequest.cp_db_id = req.teamLeader.cp_db_id || "";
      httpRequest.idfa = req.teamLeader.idfa;
    }

    if (req.clUser && req.clUser.user_id) {
      httpRequest.user_type = "CUSTOMER";
      httpRequest.user_id = req.clUser.user_id;
      httpRequest.idfa = req.clUser.idfa;
    }

    if (req.admin && req.admin.admin_id) {
      httpRequest.user_type = "ADMIN";
      httpRequest.user_id = req.admin.admin_id;
      httpRequest.fingerprint = req.admin.fp;
    }

    httpRequest.body = req.body;

    console.log(JSON.stringify({ reqPayload: httpRequest }));
    next();
  },
};
//IMP -> Citymall LOGGER
/**
 * const loggerMiddleware = expressWinston.logger({
  transports: [
    new winston.transports.Console({ timestamp: true }),
    // new winston.transports.File({
    //   name: 'debug',
    //   filename: '/tmp/debug.log',
    // }),
  ],
  metaField: null,
  requestField: null,
  responseField: null,
  format: winston.format.json(),
  level: (_req, res) => {
    let level = '';
    if (res.statusCode >= 100) {
      level = 'info';
    }
    if (res.statusCode >= 400) {
      level = 'warn';
    }
    if (res.statusCode >= 500) {
      level = 'error';
    }
    if (res.statusCode == 401 || res.statusCode == 403) {
      level = 'warn';
    }
    return level;
  },
  meta: true,
  dynamicMeta: (req, res) => {
    const httpRequest = {};
    const meta = {};

    if (req) {
      meta.httpRequest = httpRequest;

      // httpRequest.remoteIp = getRealIpFromCf(req) // this includes both ipv6 and ipv4 addresses separated by ':'
      httpRequest.remoteIp = getRealIpFromCf(req);
      httpRequest.correlationId = req.headers['x-request-id'] || '';

      if (req.teamLeader && req.teamLeader.id) {
        httpRequest.user_id = req.teamLeader.user_id;
        httpRequest.cp_db_id = req.teamLeader.cp_db_id || '';
      }

      if (req.clUser && req.clUser.user_id) {
        httpRequest.user_id = req.clUser.user_id;
      }

      if (req.admin && req.admin.admin_id) {
        httpRequest.user_id = req.admin.admin_id;
      }
    }

    if (res) {
      meta.httpRequest = httpRequest;
      httpRequest.status = res.statusCode;
    }

    if (mode === 'DEBUG') {
      httpRequest.userAgent = req.get('User-Agent');
      httpRequest.referrer = req.get('Referrer');
      httpRequest.protocol = `HTTP/${req.httpVersion}`;
      httpRequest.requestMethod = req.method;
      httpRequest.requestUrl = `${req.protocol}://${req.get('host')}${
        req.originalUrl
      }`;
      httpRequest.endpointUrl = `${req.protocol}://${req.get('host')}${
        req.originalUrl.split('?')[0]
      }`;
      httpRequest.body = req.body;
      httpRequest.requestSize = req.socket.bytesRead;

      if (req.teamLeader && req.teamLeader.id) {
        httpRequest.user_type = 'LEADER'; //
        httpRequest.user_id = req.teamLeader.user_id;
        httpRequest.cp_db_id = req.teamLeader.cp_db_id || '';
        httpRequest.idfa = req.teamLeader.idfa; //
        httpRequest.appVersion = req.headers['x-app-version'] || ''; //
        httpRequest.appVersionCode = req.headers['x-app-version-code'] || ''; //
      }

      if (req.clUser && req.clUser.user_id) {
        httpRequest.user_type = 'CUSTOMER'; //
        httpRequest.user_id = req.clUser.user_id;
        httpRequest.idfa = req.clUser.idfa; //
        httpRequest.appVersion = req.headers['x-app-version'] || ''; //
        httpRequest.appVersionCode = req.headers['x-app-version-code'] || ''; //
      }

      if (req.admin && req.admin.admin_id) {
        httpRequest.user_type = 'ADMIN'; //
        httpRequest.user_id = req.admin.admin_id;
        httpRequest.fingerprint = req.admin.fp; //
        httpRequest.appVersion = req.headers['x-app-version'] || ''; //
        httpRequest.appVersionCode = req.headers['x-app-version-code'] || ''; //
      }

      if (res) {
        if (res.error) {
          httpRequest.error = res.error;
        }

        if (res.loadTime) {
          httpRequest.loadTimeObj = res.loadTime;
        }

        httpRequest.latency = {
          seconds: Math.floor(res.responseTime / 1000),
          ms: res.responseTime,
        };

        if (res.body) {
          if (typeof res.body === 'object') {
            httpRequest.responseSize = JSON.stringify(res.body).length;
          } else if (typeof res.body === 'string') {
            httpRequest.responseSize = res.body.length;
          }
        }

        if (/[4-5]\d\d/.test(res.statusCode)) {
          httpRequest.errorResp = JSON.stringify(res.body);
        }

        httpRequest.status = res.statusCode;
        meta.httpRequest = httpRequest;
      }
    }
    return meta;
  },
  msg: '{{req.method}} {{req.url}} {{res.statusCode}} {{res.responseSize}} {{res.responseTime}}ms',
});
 */