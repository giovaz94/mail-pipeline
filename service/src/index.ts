import express from "express";
import { Request, Response, NextFunction } from 'express';
import { prometheusMetrics, createIncomingMessageCounter, createLostMessageCounter, createCompleteCounter, createTimeCounter} from "#prometheus";
import Redis from 'ioredis';
import { request, Agent } from 'undici';
import { Task } from "#logic/logic.js";
import {uuid as v4} from "uuidv4";


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
const globalLostMessage = createLostMessageCounter("global");
const incomingMessages = createIncomingMessageCounter(serviceName);
const completedMessages = createCompleteCounter();
const requestsTotalTime = createTimeCounter();

const agent = new Agent({
  connections: max_connections,      // Increase connections
  pipelining: pipeline_count,         // Keep pipelining off if server doesn't support it
});
////////////////

if (process.env.MCL === undefined) throw new Error("The MCL for the following service isn't defined");
const mcl: number = parseInt(process.env.MCL as string, 10);
const requestQueue: Task[] = [];

async function fireAndForget(msg, url) {
  try {
    const res = await request(url, {
      method: 'POST',
      body: JSON.stringify(msg),
      headers: {'Content-Type': 'application/json'},
      dispatcher: agent
    });
    res.body.resume();
  } catch(err) {
    console.error('Fire-and-forget request failed:', err);
  }
}

function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  console.log("Req received");
  const msg = req.body;
  incomingMessages.inc();
  if (requestQueue.length >= max_queue_size) {
    console.log("----message loss----");
    if (serviceName === "parser") globalLostMessage.inc();
    else {
      publisher.del(msg.data).then(res => {
        if (res > 0) globalLostMessage.inc();
      });
    }
    lostMessage.inc(); 
    res.sendStatus(500);
    return;
  }
  const ready = new Promise<void>((resolve) => {
    const task: Task = {req, res, next, resolve: () => resolve()};
    requestQueue.push(task);
  });

  ready.then(() => {
    next();
    if (serviceName === "parser") parser_logic();
    if (serviceName === "virusScanner") virus_scanner_logic(msg);
    if (serviceName === "attachment-manager" || serviceName === "image-analyzer") common_logic(msg);
    if (serviceName === "message-analyzer") message_analyzer_logic(msg);
  });
  res.sendStatus(200);
}

const app = express();
const port = process.env.PORT ?? "9001";

app.get("/metrics", prometheusMetrics);
if (mcl > 0) app.post("/request", rateLimitMiddleware);
else app.post("/request", (req: Request, res: Response) => common_logic(req.body));

const parser_logic = () => {
  const virusScanner = process.env.VIRUS_SCANNER || "undefinedService";
  const headerAnalyzer = process.env.HEADER_ANALYZER || "undefinedService";
  const linkAnalyzer = process.env.LINK_ANALYZER || "undefinedService";
  const textAnalyzer = process.env.TEXT_ANALYZER || "undefinedService";
  const id = v4();
  const n_attach = Math.floor(Math.random() * 5);
  const createDate: Date =  new Date();
  console.log(id + " has " + n_attach + " attachments");
  const msg = {data: id, time: createDate.toISOString()};
  publisher.set(id, 3 + n_attach);
  if(n_attach > 0) {
    for (let i = 0; i < n_attach; i++) { 
      fireAndForget(msg, virusScanner);
    }
  }
  fireAndForget(msg, headerAnalyzer);
  fireAndForget(msg, linkAnalyzer);
  fireAndForget(msg, textAnalyzer);
};

const virus_scanner_logic = (msg: any) => {
  const isVirus = Math.floor(Math.random() * 4) === 0;
  if (isVirus) console.log(msg.data + " has virus");
  else console.log(msg.data + ' is virus free');
  const target = isVirus ? process.env.MESSAGE_ANALYZER || "undefinedService" : process.env.ATTACHMENT_MANAGER || "undefinedService";
  fireAndForget(msg, target);
}

const common_logic = (msg: any) => {
  let target;
  if (serviceName === "attachment-manager") target = process.env.IMAGE_ANALYZER || "undefinedService";
  else target =  process.env.MESSAGE_ANALYZER || "undefinedService";
  fireAndForget(msg, target);
}

const message_analyzer_logic = (msg: any) => {
  publisher.decr(msg.data).then(res => {
    if (res === 0) {
      const now = new Date();
      completedMessages.inc();
      const time = new Date(msg.time);
      const diff = now.getTime() - time.getTime();
      console.log(msg.data + " completed in " + diff);
      requestsTotalTime.inc(diff);
      publisher.del(msg.data);
    }
  });
}

if (mcl > 0) {
  setInterval(() => {
    const task = requestQueue.shift();
    task?.resolve();
  }, 1000 / mcl);
}


const server = app.listen(port, () => {
  server.keepAliveTimeout = 65000; // 65 seconds (AWS ALB default)
  server.headersTimeout = 66000;   // Must be > keepAliveTimeout
  console.log(`${serviceName} started and listening on port ${port}`);
});