import { Response } from "express";
import logger from "./logger";

export class ApiResponse {
    public static success(
        res: Response,
        statusCode: number = 200,
        message: string = "Success",
        data?: any
    ): Response {
        const response = {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString(),
        };

        logger.info({ statusCode, message, hasData: !!data }, "API Success");
        return res.status(statusCode).json(response);
    }

    public static error(
        res: Response,
        statusCode: number = 500,
        message: string = "Internal Server Error",
        error?: any
    ): Response {
        const response = {
            success: false,
            message,
            error: process.env.NODE_ENV === "development" ? error : undefined,
            timestamp: new Date().toISOString(),
        };

        logger.error({ statusCode, message, error }, "API Error");
        return res.status(statusCode).json(response);
    }

    public static validationError(res: Response, errors: any[]): Response {
        const response = {
            success: false,
            message: "Erreur de validation",
            errors,
            timestamp: new Date().toISOString(),
        };

        logger.warn({ errors }, "Validation Error");
        return res.status(400).json(response);
    }

    public static notFound(
        res: Response,
        resource: string = "Ressource"
    ): Response {
        const message = `${resource} non trouvé(e)`;
        const response = {
            success: false,
            message,
            timestamp: new Date().toISOString(),
        };

        logger.warn({ resource }, "Resource Not Found");
        return res.status(404).json(response);
    }

    public static unauthorized(
        res: Response,
        message: string = "Non autorisé"
    ): Response {
        const response = {
            success: false,
            message,
            timestamp: new Date().toISOString(),
        };

        logger.warn({ message }, "Unauthorized Access");
        return res.status(401).json(response);
    }

    public static forbidden(
        res: Response,
        message: string = "Accès interdit"
    ): Response {
        const response = {
            success: false,
            message,
            timestamp: new Date().toISOString(),
        };

        logger.warn({ message }, "Forbidden Access");
        return res.status(403).json(response);
    }
}
