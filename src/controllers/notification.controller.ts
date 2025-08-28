import { Response } from "express";
import { AuthRequest } from "../interfaces/auth.interface";
import { NotificationService } from "../services/notification.service";
import { ApiResponse } from "../utils/apiResponse";
import { CustomError } from "../utils/customError";
import logger from "../utils/logger";
import {
    ISendEmailRequest,
    ISendInvoiceEmailRequest,
    ISendQuoteEmailRequest,
    ISendBulkEmailRequest,
    INotificationFilter,
} from "../interfaces/notification.interface";

export class NotificationController {
    /**
     * Envoie un email standard
     */
    public static async sendEmail(req: AuthRequest, res: Response) {
        try {
            logger.info(
                { userId: req.user?.id, body: req.body },
                "Demande d'envoi d'email"
            );

            const emailRequest: ISendEmailRequest = req.body;

            // Validation de base
            if (!emailRequest.to || emailRequest.to.length === 0) {
                return ApiResponse.validationError(res, [
                    {
                        field: "to",
                        message: "Au moins un destinataire est requis",
                    },
                ]);
            }

            if (!emailRequest.subject) {
                return ApiResponse.validationError(res, [
                    { field: "subject", message: "Le sujet est requis" },
                ]);
            }

            if (!emailRequest.htmlContent && !emailRequest.textContent) {
                return ApiResponse.validationError(res, [
                    {
                        field: "content",
                        message: "Le contenu HTML ou texte est requis",
                    },
                ]);
            }

            const result = await NotificationService.sendEmail(emailRequest);

            return ApiResponse.success(
                res,
                200,
                "Email envoyé avec succès",
                result
            );
        } catch (error) {
            logger.error(
                { error, userId: req.user?.id },
                "Erreur lors de l'envoi d'email"
            );
            if (error instanceof CustomError) {
                return ApiResponse.error(res, error.statusCode, error.message);
            }
            return ApiResponse.error(res, 500, "Erreur interne du serveur");
        }
    }

    /**
     * Envoie des emails en lot
     */
    public static async sendBulkEmails(req: AuthRequest, res: Response) {
        try {
            logger.info(
                { userId: req.user?.id, emailCount: req.body?.emails?.length },
                "Demande d'envoi d'emails en lot"
            );

            const { emails }: { emails: ISendEmailRequest[] } = req.body;

            if (!emails || !Array.isArray(emails) || emails.length === 0) {
                return ApiResponse.validationError(res, [
                    {
                        field: "emails",
                        message: "Une liste d'emails est requise",
                    },
                ]);
            }

            // Valider chaque email
            for (let i = 0; i < emails.length; i++) {
                const email = emails[i];
                if (!email.to || email.to.length === 0) {
                    return ApiResponse.validationError(res, [
                        {
                            field: `emails[${i}].to`,
                            message: "Destinataire requis",
                        },
                    ]);
                }
                if (!email.subject) {
                    return ApiResponse.validationError(res, [
                        {
                            field: `emails[${i}].subject`,
                            message: "Sujet requis",
                        },
                    ]);
                }
            }

            // Envoyer les emails via le service email
            // TODO: Implémenter l'envoi en lot
            const results = await Promise.allSettled(
                emails.map((email) => NotificationService.sendEmail(email))
            );

            const successful = results.filter(
                (r) => r.status === "fulfilled"
            ).length;
            const failed = results.length - successful;

            return ApiResponse.success(
                res,
                200,
                `Envoi terminé: ${successful} réussis, ${failed} échoués`,
                { successful, failed, total: results.length }
            );
        } catch (error) {
            logger.error(
                { error, userId: req.user?.id },
                "Erreur lors de l'envoi d'emails en lot"
            );
            if (error instanceof CustomError) {
                return ApiResponse.error(res, error.statusCode, error.message);
            }
            return ApiResponse.error(res, 500, "Erreur interne du serveur");
        }
    }

    /**
     * Envoie une facture par email
     */
    public static async sendInvoiceEmail(req: AuthRequest, res: Response) {
        try {
            logger.info(
                { userId: req.user?.id, invoiceId: req.params.invoiceId },
                "Demande d'envoi de facture par email"
            );

            if (!req.user?.company_id) {
                return ApiResponse.error(
                    res,
                    401,
                    "Aucune entreprise associée à l'utilisateur"
                );
            }

            const invoiceRequest: ISendInvoiceEmailRequest = {
                invoiceId: req.params.invoiceId,
                companyId: req.user.company_id,
                userId: req.user.id,
                ...req.body,
            };

            const result = await NotificationService.sendInvoiceEmail(
                invoiceRequest
            );

            return ApiResponse.success(
                res,
                200,
                "Facture envoyée par email avec succès",
                result
            );
        } catch (error) {
            logger.error(
                {
                    error,
                    userId: req.user?.id,
                    invoiceId: req.params.invoiceId,
                },
                "Erreur lors de l'envoi de facture par email"
            );
            if (error instanceof CustomError) {
                return ApiResponse.error(res, error.statusCode, error.message);
            }
            return ApiResponse.error(res, 500, "Erreur interne du serveur");
        }
    }

    /**
     * Envoie un devis par email
     */
    public static async sendQuoteEmail(req: AuthRequest, res: Response) {
        try {
            logger.info(
                { userId: req.user?.id, quoteId: req.params.quoteId },
                "Demande d'envoi de devis par email"
            );

            if (!req.user?.company_id) {
                return ApiResponse.error(
                    res,
                    401,
                    "Aucune entreprise associée à l'utilisateur"
                );
            }

            const quoteRequest: ISendQuoteEmailRequest = {
                quoteId: req.params.quoteId,
                companyId: req.user.company_id,
                userId: req.user.id,
                ...req.body,
            };

            const result = await NotificationService.sendQuoteEmail(
                quoteRequest
            );

            return ApiResponse.success(
                res,
                200,
                "Devis envoyé par email avec succès",
                result
            );
        } catch (error) {
            logger.error(
                { error, userId: req.user?.id, quoteId: req.params.quoteId },
                "Erreur lors de l'envoi de devis par email"
            );
            if (error instanceof CustomError) {
                return ApiResponse.error(res, error.statusCode, error.message);
            }
            return ApiResponse.error(res, 500, "Erreur interne du serveur");
        }
    }

    /**
     * Récupère les statistiques de notifications
     */
    public static async getStats(req: AuthRequest, res: Response) {
        try {
            logger.info(
                { userId: req.user?.id, query: req.query },
                "Demande de statistiques de notifications"
            );

            const { startDate, endDate } = req.query;
            const companyId = req.user?.company_id;

            const stats = await NotificationService.getNotificationStats(
                companyId || undefined,
                startDate ? new Date(startDate as string) : undefined,
                endDate ? new Date(endDate as string) : undefined
            );

            return ApiResponse.success(
                res,
                200,
                "Statistiques récupérées avec succès",
                stats
            );
        } catch (error) {
            logger.error(
                { error, userId: req.user?.id },
                "Erreur lors de la récupération des statistiques"
            );
            if (error instanceof CustomError) {
                return ApiResponse.error(res, error.statusCode, error.message);
            }
            return ApiResponse.error(res, 500, "Erreur interne du serveur");
        }
    }

    /**
     * Récupère l'historique des notifications
     */
    public static async getHistory(req: AuthRequest, res: Response) {
        try {
            logger.info(
                { userId: req.user?.id, query: req.query },
                "Demande d'historique de notifications"
            );

            const filter: INotificationFilter = {
                ...req.query,
                companyId: req.user?.company_id || undefined,
                startDate: req.query.startDate
                    ? new Date(req.query.startDate as string)
                    : undefined,
                endDate: req.query.endDate
                    ? new Date(req.query.endDate as string)
                    : undefined,
                page: req.query.page
                    ? parseInt(req.query.page as string)
                    : undefined,
                limit: req.query.limit
                    ? parseInt(req.query.limit as string)
                    : undefined,
            };

            const result = await NotificationService.getNotificationHistory(
                filter
            );

            return ApiResponse.success(
                res,
                200,
                "Historique récupéré avec succès",
                result
            );
        } catch (error) {
            logger.error(
                { error, userId: req.user?.id },
                "Erreur lors de la récupération de l'historique"
            );
            if (error instanceof CustomError) {
                return ApiResponse.error(res, error.statusCode, error.message);
            }
            return ApiResponse.error(res, 500, "Erreur interne du serveur");
        }
    }

    /**
     * Récupère une notification spécifique
     */
    public static async getNotification(req: AuthRequest, res: Response) {
        try {
            // TODO: Implémenter la récupération d'une notification spécifique
            return ApiResponse.success(
                res,
                200,
                "Fonctionnalité en cours de développement"
            );
        } catch (error) {
            logger.error(
                { error, userId: req.user?.id },
                "Erreur lors de la récupération de la notification"
            );
            return ApiResponse.error(res, 500, "Erreur interne du serveur");
        }
    }

    /**
     * Récupère les templates d'email
     */
    public static async getTemplates(req: AuthRequest, res: Response) {
        try {
            // TODO: Implémenter la gestion des templates
            return ApiResponse.success(
                res,
                200,
                "Fonctionnalité en cours de développement"
            );
        } catch (error) {
            logger.error(
                { error, userId: req.user?.id },
                "Erreur lors de la récupération des templates"
            );
            return ApiResponse.error(res, 500, "Erreur interne du serveur");
        }
    }

    /**
     * Crée un template d'email
     */
    public static async createTemplate(req: AuthRequest, res: Response) {
        try {
            // TODO: Implémenter la création de templates
            return ApiResponse.success(
                res,
                201,
                "Fonctionnalité en cours de développement"
            );
        } catch (error) {
            logger.error(
                { error, userId: req.user?.id },
                "Erreur lors de la création du template"
            );
            return ApiResponse.error(res, 500, "Erreur interne du serveur");
        }
    }

    /**
     * Met à jour un template d'email
     */
    public static async updateTemplate(req: AuthRequest, res: Response) {
        try {
            // TODO: Implémenter la mise à jour de templates
            return ApiResponse.success(
                res,
                200,
                "Fonctionnalité en cours de développement"
            );
        } catch (error) {
            logger.error(
                { error, userId: req.user?.id },
                "Erreur lors de la mise à jour du template"
            );
            return ApiResponse.error(res, 500, "Erreur interne du serveur");
        }
    }

    /**
     * Supprime un template d'email
     */
    public static async deleteTemplate(req: AuthRequest, res: Response) {
        try {
            // TODO: Implémenter la suppression de templates
            return ApiResponse.success(
                res,
                200,
                "Fonctionnalité en cours de développement"
            );
        } catch (error) {
            logger.error(
                { error, userId: req.user?.id },
                "Erreur lors de la suppression du template"
            );
            return ApiResponse.error(res, 500, "Erreur interne du serveur");
        }
    }

    /**
     * Gère les webhooks de Brevo
     */
    public static async handleBrevoWebhook(req: AuthRequest, res: Response) {
        try {
            logger.info({ body: req.body }, "Webhook Brevo reçu");

            // TODO: Implémenter la gestion des webhooks Brevo
            // pour mettre à jour le statut des notifications

            return ApiResponse.success(res, 200, "Webhook traité avec succès");
        } catch (error) {
            logger.error(
                { error, body: req.body },
                "Erreur lors du traitement du webhook Brevo"
            );
            return ApiResponse.error(res, 500, "Erreur interne du serveur");
        }
    }
}
