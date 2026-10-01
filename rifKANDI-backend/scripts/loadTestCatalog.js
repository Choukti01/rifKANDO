/*
 * Lightweight catalog load test for controlled environments.
 *
 * The default target is local-only. A remote target requires --allow-remote,
 * preventing accidental traffic against the live marketplace.
 */

const { performance } = require('node:perf_hooks');

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const DEFAULT_TARGET = 'http://127.0.0.1:5001';
const ENDPOINTS = [
  '/health',
  '/ready',
  '/api/products?sortBy=newest&page=1&limit=20',
  '/api/findit/requests?page=1&limit=20',
];

const option = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
};

const hasFlag = (name) => process.argv.includes(name);

const numberOption = (name, fallback, min, max, integer = false) => {
  const supplied = option(name);
  if (supplied === undefined) return fallback;
  const value = Number(supplied);
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new Error(`${name} must be ${integer ? 'a whole number' : 'a number'} between ${min} and ${max}.`);
  }
  return value;
};

const percentile = (values, ratio) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
};

const configuration = () => {
  const target = new URL(option('--target') || DEFAULT_TARGET);
  if (!['http:', 'https:'].includes(target.protocol)) throw new Error('--target must use http or https.');
  if (!LOCAL_HOSTS.has(target.hostname) && !hasFlag('--allow-remote')) {
    throw new Error('Remote load tests require --allow-remote. Use staging first and never test production without a maintenance window.');
  }

  return {
    target: target.toString().replace(/\/$/, ''),
    durationSeconds: numberOption('--duration', 15, 1, 300, true),
    concurrency: numberOption('--concurrency', 5, 1, 100, true),
    timeoutMs: numberOption('--timeout-ms', 10_000, 250, 60_000, true),
    p95MaxMs: numberOption('--p95-max-ms', 1_000, 1, 60_000, true),
    errorRateMax: numberOption('--error-rate-max', 0.02, 0, 1),
  };
};

const requestOnce = async (target, endpoint, timeoutMs) => {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${target}${endpoint}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    await response.arrayBuffer();
    return { endpoint, durationMs: performance.now() - startedAt, success: response.ok };
  } catch (error) {
    return { endpoint, durationMs: performance.now() - startedAt, success: false, error: error.name };
  }
};

const main = async () => {
  const config = configuration();
  if (hasFlag('--dry-run')) {
    console.log(JSON.stringify({ mode: 'dry-run', config, endpoints: ENDPOINTS }, null, 2));
    return;
  }

  const stopAt = Date.now() + (config.durationSeconds * 1_000);
  const results = [];
  let endpointIndex = 0;

  const worker = async () => {
    while (Date.now() < stopAt) {
      const endpoint = ENDPOINTS[endpointIndex++ % ENDPOINTS.length];
      results.push(await requestOnce(config.target, endpoint, config.timeoutMs));
    }
  };

  console.log(`Load test started: ${config.concurrency} workers for ${config.durationSeconds}s against ${config.target}`);
  await Promise.all(Array.from({ length: config.concurrency }, worker));

  const durations = results.map((result) => result.durationMs);
  const failed = results.filter((result) => !result.success);
  const byEndpoint = Object.fromEntries(ENDPOINTS.map((endpoint) => {
    const subset = results.filter((result) => result.endpoint === endpoint);
    return [endpoint, {
      requests: subset.length,
      failures: subset.filter((result) => !result.success).length,
      p95Ms: Math.round(percentile(subset.map((result) => result.durationMs), 0.95)),
    }];
  }));
  const summary = {
    target: config.target,
    totalRequests: results.length,
    successfulRequests: results.length - failed.length,
    failedRequests: failed.length,
    errorRate: results.length ? Number((failed.length / results.length).toFixed(4)) : 1,
    requestsPerSecond: Number((results.length / config.durationSeconds).toFixed(2)),
    latencyMs: {
      average: Math.round(durations.reduce((total, value) => total + value, 0) / Math.max(durations.length, 1)),
      p95: Math.round(percentile(durations, 0.95)),
      max: Math.round(Math.max(...durations, 0)),
    },
    byEndpoint,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!results.length || summary.errorRate > config.errorRateMax || summary.latencyMs.p95 > config.p95MaxMs) {
    throw new Error(`Load-test threshold failed: error rate must be <= ${config.errorRateMax}, p95 latency must be <= ${config.p95MaxMs}ms.`);
  }
};

main().catch((error) => {
  console.error(`Load test failed: ${error.message}`);
  process.exitCode = 1;
});
