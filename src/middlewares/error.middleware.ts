import { Request, Response, NextFunction } from "express";
import { CustomError } from "../utils/customError";
import { ApiResponse } from "../utils/apiResponse";
import logger from "../utils/logger";

export const errorMiddleware = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let customError = error;

    // Si ce n'est pas déjà une CustomError, la convertir
    if (!(error instanceof CustomError)) {
        customError = new CustomError(
            error.message || "Erreur interne du serveur",
            500
        );
    }

    const { message, statusCode } = customError as CustomError;

    // Logger l'erreur
    logger.error(
        {
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
                statusCode: statusCode,
            },
            request: {
                method: req.method,
                url: req.url,
                headers: req.headers,
                body: req.body,
                params: req.params,
                query: req.query,
            },
        },
        "Erreur interceptée par le middleware"
    );

    return ApiResponse.error(res, statusCode, message, error);
};

export const notFoundMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    logger.warn(
        {
            method: req.method,
            url: req.url,
            ip: req.ip,
        },
        "Route non trouvée"
    );

    return ApiResponse.notFound(res, "Route");
};
