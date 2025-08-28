import { PrismaClient } from "@prisma/client";
import logger from "../utils/logger";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log:
            process.env.NODE_ENV === "development"
                ? ["query", "info", "warn", "error"]
                : ["error"],
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Gestion propre de la déconnexion
process.on("beforeExit", async () => {
    await prisma.$disconnect();
    logger.info("Prisma Client disconnected");
});

export default prisma;
