import { RequestHandler } from "express";
import { Counter, Registry } from "prom-client";

const register = new Registry();

function toValidIdentifier(input: string): string {
  let cleaned = input.replace(/[^a-zA-Z0-9_:]/g, '_');
  if (!/^[a-zA-Z_:]/.test(cleaned)) {
    cleaned = '_' + cleaned;
  }

  return cleaned;
}

export const prometheusMetrics: RequestHandler = async (req: any, res: any) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
};

export function createCounter(
  name: string,
  help: string,
  labelNames: string[] = [],
): Counter<string> {
  const cleaned: string = toValidIdentifier(name);
  const counter = new Counter({
    name: cleaned,
    help,
    labelNames,
    registers: [register],
  });

  return counter;
}

export function createSimpleCounter(
  name: string,
  help: string,
): Counter<string> {

  return createCounter(toValidIdentifier(name), help);
}

export function createIncomingMessageCounter(
  serviceName: string,
): Counter<string> {
  const counter = createCounter(
    `http_requests_total_${serviceName}_counter`,
    `Total number of requests sent to ${serviceName} services`,
    ["service", "status"],
  );
  counter.inc();
  return counter;
}

export function createLostMessageCounter(serviceName: string): Counter<string> {
  const counter = createCounter(
    `message_lost_${serviceName}_counter`,
    "Total number of messages that failed to be delivered",
    ["service", "reason"],
  );
  counter.inc();
  return counter;
}

export function createQueueLostMessageCounter(): Counter<string> {
  const counter = createCounter(
    `queue_message_loss`,
    "Total number of messages that failed to be delivered",
    ["service", "reason"],
  );
  counter.inc();
  return counter;
}

export function createCompleteCounter(): Counter<string> {
  const counter = createCounter(
    "http_requests_total_global",
    "Total number of messages completed",
    ["service", "reason"],
  );
  counter.inc();
  return counter;
}

export function createTimeCounter(): Counter<string> {
   const counter = createCounter(
    "http_requests_total_time",
    "Time needed to analyse a message",
    ["service", "reason"],
  );
  counter.inc();
  return counter;
}