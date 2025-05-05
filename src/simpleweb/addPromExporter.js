const Prometheus = require('prom-client');
const url = require('url');
const UrlValueParser = require('url-value-parser');
const express = require('express');

/**
 * Adds a Prometheus exporter to the given app with the specified prefix.
 *
 * @param {express.Application} app - The Express app to add the exporter to.
 * @param {string} prefix - The prefix to use for the exporter's metric names.
 */
const addPrometheusExporter = (app, prefix) => {
  const POD = process.env.HOSTNAME || 'unknown';
  const LABELS = ['route', 'method', 'status', 'pod'];
  const requestDurationBuckets = [
    0.0001, 0.0005, 0.002, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1,
    2.5, 5,
  ];
  const requestLengthBuckets = [512, 1024, 5120, 10240, 51200, 102400];
  const responseLengthBuckets = [512, 1024, 5120, 10240, 51200, 102400];

  const requestDuration = new Prometheus.Histogram({
    name: `${prefix}http_request_duration_seconds`,
    help: 'Duration of HTTP requests in seconds',
    labelNames: LABELS,
    buckets: requestDurationBuckets,
  });
  const requestCount = new Prometheus.Counter({
    name: `${prefix}http_requests_total`,
    help: 'Counter for total requests received',
    labelNames: LABELS,
  });
  const requestLength = new Prometheus.Histogram({
    name: `${prefix}http_request_length_bytes`,
    help: 'Content-Length of HTTP request',
    labelNames: LABELS,
    buckets: requestLengthBuckets,
  });
  const responseLength = new Prometheus.Histogram({
    name: `${prefix}http_response_length_bytes`,
    help: 'Content-Length of HTTP response',
    labelNames: LABELS,
    buckets: responseLengthBuckets,
  });

  Prometheus.collectDefaultMetrics({ prefix });

  try {
    const gcStats = require('prometheus-gc-stats');
    const startGcStats = gcStats(Prometheus.register, {
      prefix: prefix,
    });
    startGcStats();
  } catch (err) {
    // the dependency has not been installed, skipping
  }

  /**
   * Normalize the given original URL path by replacing path values with the specified placeholder.
   *
   * @param {string} originalUrl - The original URL to normalize the path for.
   * @param {[]string} extraMasks - An optional array of extra masks to use for path value replacement.
   * @param {string} placeholder - An optional placeholder to use for replaced path values. Defaults to '#val'.
   * @return {string} - The normalized URL path with path values replaced.
   */
  function normalizePath(originalUrl, extraMasks = [], placeholder = '#val') {
    const { pathname } = url.parse(originalUrl);
    const urlParser = new UrlValueParser({ extraMasks });
    return urlParser.replacePathValues(pathname, placeholder);
  }

  /**
   * Normalizes the given status code and returns the corresponding range.
   *
   * @param {number} status - The status code to be normalized.
   * @return {string} The normalized range of the status code.
   */
  function normalizeStatusCode(status) {
    if (status >= 200 && status < 300) {
      return '2XX';
    }

    if (status >= 300 && status < 400) {
      return '3XX';
    }

    if (status >= 400 && status < 500) {
      return '4XX';
    }

    return '5XX';
  }

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      // console.log('DEBUG_URL', {originalUrl: req.originalUrl, params: req.params });
      try {
        // Remove query parameters
        let path = decodeURIComponent(req.originalUrl.split('?')[0]);

        // Remove path variables
        for (let key in req.params) {
          if (
            Object.prototype.hasOwnProperty.call(req.params, key) &&
            req.params[key] != null &&
            req.params[key] != undefined
          ) {
            path = path.replace(req.params[key], ':' + key);
          }
        }

        const cleanPath = normalizePath(path);

        const time = Date.now() - start;
        const timeSeconds = time / 1000;

        const status = normalizeStatusCode(res.statusCode);

        const labels = {
          route: cleanPath,
          method: req.method,
          status,
          pod: POD,
        };

        requestCount.inc(labels);

        // observe normalizing to seconds
        requestDuration.observe(labels, timeSeconds);

        // observe request length
        if (requestLengthBuckets.length) {
          const reqLength = req.headers['Content-Length'];
          if (reqLength) {
            requestLength.observe(labels, Number(reqLength));
          }
        }

        // observe response length
        if (responseLengthBuckets.length) {
          const resLength = res.get('Content-Length');
          if (resLength) {
            responseLength.observe(labels, Number(resLength));
          }
        }
      } catch (err) {
        console.error(err);
      }
    });

    next();
  });

  /**
   * Metrics route to be used by prometheus to scrape metrics
   */
  app.get('/metrics', async (req, res, next) => {
    res.set('Content-Type', Prometheus.register.contentType);
    return res.end(Prometheus.register.metrics());
  });
};

module.exports = addPrometheusExporter;
