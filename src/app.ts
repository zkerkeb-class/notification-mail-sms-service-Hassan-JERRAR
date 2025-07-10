import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { config } from "dotenv";
import logger from "./utils/logger";
import { loggerMiddleware } from "./middlewares/logger.middleware";
import {
    errorMiddleware,
    notFoundMiddleware,
} from "./middlewares/error.middleware";
import routes from "./routes";

// Configuration des variables d'environnement
config();

const app = express();
const PORT = process.env.PORT || 3002;

// Trust proxy pour les déploiements derrière un reverse proxy
app.set("trust proxy", 1);

// Configuration CORS
const corsOptions = {
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
    optionsSuccessStatus: 200,
};

// Middlewares de sécurité
app.use(
    helmet({
        contentSecurityPolicy: false, // Désactivé pour permettre les liens de paiement
    })
);
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === "production" ? 100 : 1000, // Limite par IP
    message: "Trop de requêtes depuis cette IP, veuillez réessayer plus tard.",
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Middlewares de parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Middleware de logging
app.use(loggerMiddleware);

// Route de santé
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        service: "notification-microservice",
        version: process.env.npm_package_version || "1.0.0",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
    });
});

// Routes principales
app.use("/api/notifications", routes);

// Middleware pour les routes non trouvées
app.use(notFoundMiddleware);

// Middleware de gestion d'erreurs (doit être en dernier)
app.use(errorMiddleware);

// Gestion propre de l'arrêt du serveur
process.on("SIGINT", () => {
    logger.info("Signal SIGINT reçu, arrêt propre du serveur...");
    process.exit(0);
});

process.on("SIGTERM", () => {
    logger.info("Signal SIGTERM reçu, arrêt propre du serveur...");
    process.exit(0);
});

process.on("unhandledRejection", (reason, promise) => {
    logger.error({ reason, promise }, "Promesse rejetée non gérée détectée");
    process.exit(1);
});

process.on("uncaughtException", (error) => {
    logger.error({ error }, "Exception non capturée détectée");
    process.exit(1);
});

// Démarrage du serveur
const server = app.listen(PORT, () => {
    logger.info(
        {
            port: PORT,
            environment: process.env.NODE_ENV || "development",
            service: "notification-microservice",
        },
        `🚀 Serveur de notifications démarré sur le port ${PORT}`
    );
});

// Configuration du timeout du serveur
server.timeout = 30000; // 30 secondes

export default app;
