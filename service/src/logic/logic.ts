
import { Request, Response, NextFunction } from 'express';
import { Counter } from 'prom-client';

export type PrometheusCounters = {
    message_loss: Counter<string>;
    incomingMessages: Counter<string>;
    [key: string]: Counter<string>;
};

export type ServiceConfiguration = {
    pipelineCount: number,
    serviceName: string,
    prometheusCounters: PrometheusCounters
}

export type Task = {
    resolve: (body: any) => void;
    req: Request;
    res: Response;
    next: NextFunction;
};

export type ServiceExecutionLogic<T> = (configuration: ServiceConfiguration, params:Task) => T;
