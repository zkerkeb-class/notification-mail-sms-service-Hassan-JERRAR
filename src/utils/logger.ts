import pino from "pino";

const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: process.env.NODE_ENV !== "production",
            translateTime: "SYS:dd/mm/yyyy HH:MM:ss",
            ignore: "pid,hostname",
        },
    },
    formatters: {
        level: (label) => {
            return { level: label.toUpperCase() };
        },
    },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    base: {
        service: "notification-microservice",
        version: process.env.npm_package_version || "1.0.0",
    },
});

export default logger;
