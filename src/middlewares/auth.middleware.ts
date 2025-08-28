import { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase";
import { AuthRequest } from "../interfaces/auth.interface";
import { ApiResponse } from "../utils/apiResponse";
import logger from "../utils/logger";
import prisma from "../lib/prisma";

export const authMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return ApiResponse.unauthorized(
                res,
                "Token d'authentification manquant"
            );
        }

        const token = authHeader.substring(7);

        // Vérifier le token avec Supabase
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser(token);

        if (error || !user) {
            logger.warn({ error }, "Token d'authentification invalide");
            return ApiResponse.unauthorized(res, "Token invalide");
        }

        // Récupérer les informations utilisateur depuis notre base
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                company_id: true,
                onboarding_completed: true,
                stripe_account_id: true,
                stripe_onboarded: true,
            },
        });

        if (!dbUser) {
            logger.warn({ userId: user.id }, "Utilisateur non trouvé en base");
            return ApiResponse.unauthorized(res, "Utilisateur non trouvé");
        }

        req.user = dbUser;
        next();
    } catch (error) {
        logger.error(
            { error },
            "Erreur lors de la vérification d'authentification"
        );
        return ApiResponse.error(
            res,
            500,
            "Erreur lors de la vérification d'authentification"
        );
    }
};

export const optionalAuthMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            // Pas d'authentification requise, continuer sans utilisateur
            return next();
        }

        const token = authHeader.substring(7);

        const {
            data: { user },
            error,
        } = await supabase.auth.getUser(token);

        if (!error && user) {
            const dbUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: {
                    id: true,
                    email: true,
                    first_name: true,
                    last_name: true,
                    company_id: true,
                    onboarding_completed: true,
                    stripe_account_id: true,
                    stripe_onboarded: true,
                },
            });

            if (dbUser) {
                req.user = dbUser;
            }
        }

        next();
    } catch (error) {
        // En cas d'erreur, continuer sans authentification
        logger.warn({ error }, "Erreur lors de l'authentification optionnelle");
        next();
    }
};
