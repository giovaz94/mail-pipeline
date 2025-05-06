import express from "express";
import { Request, Response, NextFunction } from 'express';
import { prometheusMetrics, createIncomingMessageCounter, createLostMessageCounter } from "#prometheus";
import Redis from 'ioredis';
// import axios from "axios";
import { Agent } from 'undici';
import { Task } from "#logic/logic.js";


const publisher = new Redis({
  host:  process.env.REDIS_HOST || 'redis',
  port: 6379,
});

///PROM METRICS///
const max_queue_size = parseInt(process.env.MAX_SIZE || "50");
const max_connections = parseInt(process.env.MAX_CONNECTIONS || "40");
const pipeline_count = parseInt(process.env.PIPELINE_COUNT || "0");
const serviceName: string = process.env.SERVICE_NAME || "undefinedService";
const lostMessage = createLostMessageCounter(serviceName);
const incomingMessages = createIncomingMessageCounter(serviceName);
const agent = new Agent({
  connections: max_connections,      // Increase connections
  pipelining: pipeline_count,         // Keep pipelining off if server doesn't support it
});
////////////////

if (process.env.MCL === undefined) throw new Error("The MCL for the following service isn't defined");
const mcl: number = parseInt(process.env.MCL as string, 10);
const requestQueue: Task[] = [];

function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  console.log("Req received");
  incomingMessages.inc();
  if (requestQueue.length >= max_queue_size) {
    console.log("----message loss----");
    lostMessage.inc(); 
    res.sendStatus(500);
    return;
  }
  const ready = new Promise<Task>((resolve) => {
    const task: Task = {req, res, next, resolve: () => resolve()};
    requestQueue.push(task);
  });

  ready.then(() => {
    next();
    if (serviceName == "parser") parser_logic();
  });
  res.sendStatus(200);
}

const app = express();
const port = process.env.PORT ?? "9001";

app.get("/metrics", prometheusMetrics);
app.post("/request", rateLimitMiddleware);

const parser_logic = async () => {
  // Insert here the specific logic of the service 
};

setInterval(() => {
  const task = requestQueue.shift();
  if (task) task.resolve();
}, 1000 / mcl);

const server = app.listen(port, () => {
  server.keepAliveTimeout = 65000; // 65 seconds (AWS ALB default)
  server.headersTimeout = 66000;   // Must be > keepAliveTimeout
  console.log(`${serviceName} started and listening on port ${port}`);
});