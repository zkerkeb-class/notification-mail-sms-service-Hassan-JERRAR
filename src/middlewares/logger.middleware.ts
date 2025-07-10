import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import { randomBytes } from "crypto";

declare global {
    namespace Express {
        interface Request {
            requestId?: string;
            startTime?: number;
        }
    }
}

export const loggerMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Générer un ID unique pour cette requête
    req.requestId = randomBytes(16).toString("hex");
    req.startTime = Date.now();

    // Logger le début de la requête
    logger.info(
        {
            requestId: req.requestId,
            method: req.method,
            url: req.url,
            userAgent: req.get("User-Agent"),
            ip: req.ip,
            headers: {
                authorization: req.headers.authorization
                    ? "Bearer ***"
                    : undefined,
                "content-type": req.headers["content-type"],
                accept: req.headers.accept,
            },
            body: req.method !== "GET" ? req.body : undefined,
            query: Object.keys(req.query).length > 0 ? req.query : undefined,
            params: Object.keys(req.params).length > 0 ? req.params : undefined,
        },
        "Requête entrante"
    );

    // Intercepter la réponse pour logger la fin
    const originalSend = res.send;
    res.send = function (body: any) {
        const duration = Date.now() - (req.startTime || 0);

        logger.info(
            {
                requestId: req.requestId,
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                responseSize: Buffer.byteLength(body),
            },
            "Requête terminée"
        );

        return originalSend.call(this, body);
    };

    next();
};
