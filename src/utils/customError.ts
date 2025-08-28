export class CustomError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(
        message: string,
        statusCode: number = 500,
        isOperational: boolean = true
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        // Maintenir la stack trace pour les erreurs personnalisées
        Error.captureStackTrace(this, this.constructor);
    }
}
