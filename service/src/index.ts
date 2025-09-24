import express from "express";
import { Request, Response, NextFunction } from 'express';
import { prometheusMetrics, createIncomingMessageCounter, createLostMessageCounter, createCompleteCounter, createTimeCounter} from "#prometheus";
import Redis from 'ioredis';
import { request, Agent } from 'undici';
import { Task } from "#logic/logic.js";
import {uuid as v4} from "uuidv4";
import { Counter } from "prom-client";


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

let completedMessages: Counter<string>
let requestsTotalTime: Counter<string>

if (serviceName === "message-analyzer") {
  completedMessages = createCompleteCounter();
  requestsTotalTime = createTimeCounter();
}

const agent = new Agent({
  connections: max_connections,      // Increase connections
  pipelining: pipeline_count,         // Keep pipelining off if server doesn't support it
});
////////////////

if (process.env.MCL === undefined) throw new Error("The MCL for the following service isn't defined");
const mcl: number = parseInt(process.env.MCL as string, 10);
const requestQueue: Task[] = [];

async function fireAndForget(msg: any, url: string) {
  try {
    const res = await request(url, {
      method: 'POST',
      body: JSON.stringify(msg),
      headers: {'Content-Type': 'application/json'},
      dispatcher: agent
    });
    //res.body.resume();
  } catch(err) {
    console.error('Fire-and-forget request failed:', err);
  }
}

function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  console.log("Req received");
  const msg = req.body;
  incomingMessages.inc();
  if (requestQueue.length >= max_queue_size) {
    res.sendStatus(500);
    console.log("----message loss----");
    if (serviceName === "parser") globalLostMessage.inc();
    else {
      publisher.del(msg.data).then(res => {
        if (res > 0) globalLostMessage.inc();
      });
    }
    lostMessage.inc(); 
    return;
  }
  res.sendStatus(200);
  const ready = new Promise<void>((resolve) => {
    const task: Task = {req, res, next, resolve: () => resolve()};
    requestQueue.push(task);
  });

  ready.then(() => {
    next();
    if (serviceName === "parser") parser_logic();
    if (serviceName === "virus-scanner") virus_scanner_logic(msg);
    if (serviceName === "attachment-manager" || serviceName === "image-analyzer") common_logic(msg);
    if (serviceName === "message-analyzer") message_analyzer_logic(msg);
  });
  return
}

const app = express();
const port = process.env.PORT ?? "9001";

app.use(express.json()); 
app.get("/metrics", prometheusMetrics);
if (mcl > 0) app.post("/request", rateLimitMiddleware);
else app.post("/request", (req: Request, res: Response) => {
  res.sendStatus(200)
  common_logic(req.body)

});

const parser_logic = async () => {
  const virusScanner = process.env.VIRUS_SCANNER || "undefinedService";
  const headerAnalyzer = process.env.HEADER_ANALYZER || "undefinedService";
  const linkAnalyzer = process.env.LINK_ANALYZER || "undefinedService";
  const textAnalyzer = process.env.TEXT_ANALYZER || "undefinedService";
  const id = v4();
  const n_attach = Math.floor(Math.random() * 5);
  
  const pipeline = publisher.pipeline();
  pipeline.set(id, 3 + n_attach);
  pipeline.time(); 
  
  const results = await pipeline.exec();
  if (!results || !results[1] || !results[1][1]) {
    throw new Error("Failed to retrieve Redis timestamp from pipeline results");
  }
  const redisTime = results[1][1] as [string, string];
  const createTime = parseInt(redisTime[0]) * 1000 + Math.floor(parseInt(redisTime[1]) / 1000);
  
  console.log(id + " has " + n_attach + " attachments");
  const msg = {data: id, time: createTime};
  
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
  console.log(`Sending to ${target}`)
  fireAndForget(msg, target);
}

const common_logic = (msg: any) => {
  let target;
  if (serviceName === "attachment-manager") target = process.env.IMAGE_ANALYZER || "undefinedService";
  else target =  process.env.MESSAGE_ANALYZER || "undefinedService";
  console.log(`sending message to ${target}`);
  fireAndForget(msg, target);
}

const message_analyzer_logic = async (msg: any) => {
  const decrementResult = await publisher.decr(msg.data);
  console.log(`Message ${msg.data} has ${decrementResult} items to analyze`);
  
  if (decrementResult == 0) {
    completedMessages.inc();
    
    
    const redisTimeResult = await publisher.time();
    const now = parseInt(redisTimeResult[0].toString()) * 1000 + Math.floor(parseInt(redisTimeResult[1].toString()) / 1000);
    
    const diff = now - parseInt(msg.time);
    console.log(msg.data + " completed in " + diff);
    requestsTotalTime.inc(diff);
    publisher.del(msg.data);
  }
};

if (mcl > 0) {
  setInterval(() => {
    const task = requestQueue.shift();
    task?.resolve();
  }, 1000 / mcl);
}


const server = app.listen(port, () => {
  server.keepAliveTimeout = 5000; // 65 seconds (AWS ALB default)
  server.headersTimeout = 6000;   // Must be > keepAliveTimeout
  console.log(`${serviceName} started and listening on port ${port}`);
});