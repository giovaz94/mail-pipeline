import { RequestHandler } from "express";
import { Counter, Registry } from "prom-client";

const register = new Registry();


export const prometheusMetrics: RequestHandler = async (req: any, res: any) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
};

export function createCounter(
  name: string,
  help: string,
  labelNames: string[] = [],
): Counter<string> {
  const counter = new Counter({
    name,
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
  return createCounter(name, help);
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
    `message_lost_${serviceName}`,
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
    "'http_requests_total_global",
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