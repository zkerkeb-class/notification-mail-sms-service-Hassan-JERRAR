import Redis from "ioredis";
import logger from "../utils/logger";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: true,
});

redis.on("connect", () => {
    logger.info("Connexion Redis établie");
});

redis.on("ready", () => {
    logger.info("Redis prêt à recevoir des commandes");
});

redis.on("error", (err) => {
    logger.error({ error: err }, "Erreur Redis");
});

redis.on("close", () => {
    logger.warn("Connexion Redis fermée");
});

redis.on("reconnecting", () => {
    logger.info("Reconnexion Redis en cours...");
});

// Gestion propre de la déconnexion
process.on("SIGINT", () => {
    logger.info("Fermeture propre de Redis...");
    redis.disconnect();
});

process.on("SIGTERM", () => {
    logger.info("Fermeture propre de Redis...");
    redis.disconnect();
});

export default redis;
