import logger from "../utils/logger";
import prisma from "../lib/prisma";
import emailService from "./email.service";
import { PdfService } from "./pdf.service";
import { CustomError } from "../utils/customError";
import {
    ISendEmailRequest,
    ISendInvoiceEmailRequest,
    ISendQuoteEmailRequest,
    ISendBulkEmailRequest,
    INotificationResponse,
    INotificationStats,
    INotificationFilter,
    IEmailSender,
    IEmailRecipient,
} from "../interfaces/notification.interface";
// Types définis localement en attendant la génération du client Prisma
enum NotificationType {
    CUSTOM = "CUSTOM",
    INVOICE_SENT = "INVOICE_SENT",
    QUOTE_SENT = "QUOTE_SENT",
    PAYMENT_REMINDER = "PAYMENT_REMINDER",
    PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
    WELCOME = "WELCOME",
    PASSWORD_RESET = "PASSWORD_RESET",
}

enum NotificationStatus {
    pending = "pending",
    sent = "sent",
    delivered = "delivered",
    opened = "opened",
    clicked = "clicked",
    bounced = "bounced",
    failed = "failed",
}

export class NotificationService {
    /**
     * Envoie un email standard
     */
    public static async sendEmail(
        request: ISendEmailRequest
    ): Promise<INotificationResponse> {
        logger.info(
            {
                to: request.to.map((r) => r.email),
                subject: request.subject,
                hasTemplate: !!request.templateId,
                hasAttachments: !!request.attachments?.length,
            },
            "Début d'envoi d'email standard"
        );

        try {
            // Créer la notification en base
            const notification = await prisma.emailNotification.create({
                data: {
                    user_id: "system", // TODO: récupérer de l'authentification
                    company_id: "system", // TODO: récupérer de l'authentification
                    recipient_email: request.to[0].email,
                    recipient_name: request.to[0].name,
                    sender_email:
                        request.sender?.email || "notifications@zenbilling.com",
                    sender_name:
                        request.sender?.name || "ZenBilling Notifications",
                    subject: request.subject,
                    html_content: request.htmlContent || "",
                    text_content: request.textContent,
                    type: NotificationType.CUSTOM,
                    status: NotificationStatus.pending,
                    variables: request.templateVariables
                        ? JSON.stringify(request.templateVariables)
                        : null,
                    scheduled_at: request.scheduledAt,
                    priority: request.priority || 5,
                    metadata: request.metadata
                        ? JSON.stringify(request.metadata)
                        : null,
                },
            });

            // Envoyer l'email via le service email
            const result = await emailService.sendEmail(
                request.to,
                request.subject,
                request.htmlContent || "",
                request.textContent,
                request.sender,
                request.cc,
                request.bcc
            );

            // Mettre à jour le statut
            await prisma.emailNotification.update({
                where: { notification_id: notification.notification_id },
                data: {
                    status: NotificationStatus.sent,
                    sent_at: new Date(),
                    external_id: result.body.messageId,
                },
            });

            logger.info(
                {
                    notificationId: notification.notification_id,
                    to: request.to.map((r) => r.email),
                    messageId: result.body.messageId,
                },
                "Email envoyé avec succès"
            );

            return {
                notificationId: notification.notification_id,
                status: "sent",
                message: "Email envoyé avec succès",
                sentAt: new Date(),
                externalId: result.body.messageId,
            };
        } catch (error) {
            logger.error(
                {
                    error,
                    to: request.to.map((r) => r.email),
                    subject: request.subject,
                },
                "Erreur lors de l'envoi d'email"
            );
            throw new CustomError("Erreur lors de l'envoi d'email", 500);
        }
    }

    /**
     * Envoie une facture par email avec PDF
     */
    public static async sendInvoiceEmail(
        request: ISendInvoiceEmailRequest
    ): Promise<INotificationResponse> {
        logger.info(
            {
                invoiceId: request.invoiceId,
                companyId: request.companyId,
                userId: request.userId,
            },
            "Début d'envoi de facture par email"
        );

        try {
            // Récupérer la facture avec tous les détails
            const invoice = await prisma.invoice.findFirst({
                where: {
                    invoice_id: request.invoiceId,
                    company_id: request.companyId,
                },
                include: {
                    customer: {
                        include: {
                            individual: true,
                            business: true,
                        },
                    },
                    user: {
                        include: {
                            Company: true,
                        },
                    },
                },
            });

            if (!invoice) {
                throw new CustomError("Facture non trouvée", 404);
            }

            if (!invoice.customer.email) {
                throw new CustomError("Le client n'a pas d'adresse email", 400);
            }

            // Récupérer l'utilisateur qui envoie l'email
            const user = await prisma.user.findUnique({
                where: { id: request.userId },
                include: { Company: true },
            });

            if (!user) {
                throw new CustomError("Utilisateur non trouvé", 404);
            }

            // Générer le PDF
            const pdfBuffer = await PdfService.generateInvoicePdf(
                request.invoiceId
            );

            // Préparer le nom du client
            const customerName = invoice.customer.business
                ? invoice.customer.business.name
                : `${invoice.customer.individual?.first_name} ${invoice.customer.individual?.last_name}`;

            // Préparer le nom de l'entreprise
            const companyName =
                user.Company?.name || `${user.first_name} ${user.last_name}`;

            // Préparer le contenu de l'email
            let htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
                        <h1 style="color: #333; margin-bottom: 20px;">Facture ${invoice.invoice_number}</h1>
                        
                        <p style="font-size: 16px; margin-bottom: 15px;">Bonjour ${customerName},</p>
                        
                        <p style="font-size: 16px; margin-bottom: 15px;">
                            Veuillez trouver ci-joint votre facture n° ${invoice.invoice_number}.
                        </p>
            `;

            if (request.customMessage) {
                htmlContent += `
                        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #333; margin-top: 0;">Message personnalisé :</h3>
                            <p style="font-size: 16px; margin: 0;">${request.customMessage}</p>
                        </div>
                `;
            }

            htmlContent += `
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                            <p style="margin: 0 0 5px 0;">Cordialement,</p>
                            <p style="margin: 0; font-weight: bold;">${user.first_name} ${user.last_name}</p>
                            <p style="margin: 5px 0 0 0; color: #666;">${companyName}</p>
                        </div>
                    </div>
                </div>
            `;

            // Créer la notification en base
            const notification = await prisma.emailNotification.create({
                data: {
                    user_id: request.userId,
                    customer_id: invoice.customer.customer_id,
                    company_id: request.companyId,
                    invoice_id: request.invoiceId,
                    recipient_email: invoice.customer.email,
                    recipient_name: customerName,
                    sender_email: user.email || "noreply@zenbilling.com",
                    sender_name: `${user.first_name} ${user.last_name}`,
                    subject: `Facture ${invoice.invoice_number}`,
                    html_content: htmlContent,
                    type: NotificationType.INVOICE_SENT,
                    status: NotificationStatus.pending,
                    scheduled_at: request.scheduledAt,
                    metadata: JSON.stringify({
                        includePaymentLink: request.includePaymentLink,
                        customMessage: request.customMessage,
                    }),
                },
            });

            // Envoyer l'email avec la facture en pièce jointe
            const result = await emailService.sendEmailWithAttachment(
                [{ email: invoice.customer.email, name: customerName }],
                `Facture ${invoice.invoice_number}`,
                htmlContent,
                [
                    {
                        filename: `facture-${invoice.invoice_number}.pdf`,
                        content: pdfBuffer,
                        contentType: "application/pdf",
                    },
                ],
                undefined, // textContent
                {
                    name: `${user.first_name} ${user.last_name}`,
                    email: user.email || "noreply@zenbilling.com",
                }
            );

            // Mettre à jour le statut de la facture si nécessaire
            if (invoice.status === "pending") {
                await prisma.invoice.update({
                    where: { invoice_id: request.invoiceId },
                    data: { status: "sent" },
                });
            }

            // Mettre à jour la notification
            await prisma.emailNotification.update({
                where: { notification_id: notification.notification_id },
                data: {
                    status: NotificationStatus.sent,
                    sent_at: new Date(),
                    external_id: result.body.messageId,
                },
            });

            logger.info(
                {
                    notificationId: notification.notification_id,
                    invoiceId: request.invoiceId,
                    customerEmail: invoice.customer.email,
                    messageId: result.body.messageId,
                },
                "Facture envoyée par email avec succès"
            );

            return {
                notificationId: notification.notification_id,
                status: "sent",
                message: "Facture envoyée par email avec succès",
                sentAt: new Date(),
                externalId: result.body.messageId,
            };
        } catch (error) {
            logger.error(
                {
                    error,
                    invoiceId: request.invoiceId,
                    companyId: request.companyId,
                    userId: request.userId,
                },
                "Erreur lors de l'envoi de la facture par email"
            );
            if (error instanceof CustomError) {
                throw error;
            }
            throw new CustomError(
                "Erreur lors de l'envoi de la facture par email",
                500
            );
        }
    }

    /**
     * Envoie un devis par email avec PDF
     */
    public static async sendQuoteEmail(
        request: ISendQuoteEmailRequest
    ): Promise<INotificationResponse> {
        logger.info(
            {
                quoteId: request.quoteId,
                companyId: request.companyId,
                userId: request.userId,
            },
            "Début d'envoi de devis par email"
        );

        try {
            // Récupérer le devis avec tous les détails
            const quote = await prisma.quote.findFirst({
                where: {
                    quote_id: request.quoteId,
                    company_id: request.companyId,
                },
                include: {
                    customer: {
                        include: {
                            individual: true,
                            business: true,
                        },
                    },
                    user: {
                        include: {
                            Company: true,
                        },
                    },
                },
            });

            if (!quote) {
                throw new CustomError("Devis non trouvé", 404);
            }

            if (!quote.customer.email) {
                throw new CustomError("Le client n'a pas d'adresse email", 400);
            }

            // Récupérer l'utilisateur qui envoie l'email
            const user = await prisma.user.findUnique({
                where: { id: request.userId },
                include: { Company: true },
            });

            if (!user) {
                throw new CustomError("Utilisateur non trouvé", 404);
            }

            // Générer le PDF
            const pdfBuffer = await PdfService.generateQuotePdf(
                request.quoteId
            );

            // Préparer le nom du client
            const customerName = quote.customer.business
                ? quote.customer.business.name
                : `${quote.customer.individual?.first_name} ${quote.customer.individual?.last_name}`;

            // Préparer le nom de l'entreprise
            const companyName =
                user.Company?.name || `${user.first_name} ${user.last_name}`;

            // Préparer le contenu de l'email
            let htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
                        <h1 style="color: #333; margin-bottom: 20px;">Devis ${quote.quote_number}</h1>
                        
                        <p style="font-size: 16px; margin-bottom: 15px;">Bonjour ${customerName},</p>
                        
                        <p style="font-size: 16px; margin-bottom: 15px;">
                            Veuillez trouver ci-joint votre devis n° ${quote.quote_number}.
                        </p>
            `;

            if (request.customMessage) {
                htmlContent += `
                        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #333; margin-top: 0;">Message personnalisé :</h3>
                            <p style="font-size: 16px; margin: 0;">${request.customMessage}</p>
                        </div>
                `;
            }

            htmlContent += `
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                            <p style="margin: 0 0 5px 0;">Cordialement,</p>
                            <p style="margin: 0; font-weight: bold;">${user.first_name} ${user.last_name}</p>
                            <p style="margin: 5px 0 0 0; color: #666;">${companyName}</p>
                        </div>
                    </div>
                </div>
            `;

            // Créer la notification en base
            const notification = await prisma.emailNotification.create({
                data: {
                    user_id: request.userId,
                    customer_id: quote.customer.customer_id,
                    company_id: request.companyId,
                    quote_id: request.quoteId,
                    recipient_email: quote.customer.email,
                    recipient_name: customerName,
                    sender_email: user.email || "noreply@zenbilling.com",
                    sender_name: `${user.first_name} ${user.last_name}`,
                    subject: `Devis ${quote.quote_number}`,
                    html_content: htmlContent,
                    type: NotificationType.QUOTE_SENT,
                    status: NotificationStatus.pending,
                    scheduled_at: request.scheduledAt,
                    metadata: JSON.stringify({
                        customMessage: request.customMessage,
                    }),
                },
            });

            // Envoyer l'email avec le devis en pièce jointe
            const result = await emailService.sendEmailWithAttachment(
                [{ email: quote.customer.email, name: customerName }],
                `Devis ${quote.quote_number}`,
                htmlContent,
                [
                    {
                        filename: `devis-${quote.quote_number}.pdf`,
                        content: pdfBuffer,
                        contentType: "application/pdf",
                    },
                ],
                undefined, // textContent
                {
                    name: `${user.first_name} ${user.last_name}`,
                    email: user.email || "noreply@zenbilling.com",
                }
            );

            // Mettre à jour le statut du devis si nécessaire
            if (quote.status === "draft") {
                await prisma.quote.update({
                    where: { quote_id: request.quoteId },
                    data: { status: "sent" },
                });
            }

            // Mettre à jour la notification
            await prisma.emailNotification.update({
                where: { notification_id: notification.notification_id },
                data: {
                    status: NotificationStatus.sent,
                    sent_at: new Date(),
                    external_id: result.body.messageId,
                },
            });

            logger.info(
                {
                    notificationId: notification.notification_id,
                    quoteId: request.quoteId,
                    customerEmail: quote.customer.email,
                    messageId: result.body.messageId,
                },
                "Devis envoyé par email avec succès"
            );

            return {
                notificationId: notification.notification_id,
                status: "sent",
                message: "Devis envoyé par email avec succès",
                sentAt: new Date(),
                externalId: result.body.messageId,
            };
        } catch (error) {
            logger.error(
                {
                    error,
                    quoteId: request.quoteId,
                    companyId: request.companyId,
                    userId: request.userId,
                },
                "Erreur lors de l'envoi du devis par email"
            );
            if (error instanceof CustomError) {
                throw error;
            }
            throw new CustomError(
                "Erreur lors de l'envoi du devis par email",
                500
            );
        }
    }

    /**
     * Récupère les statistiques de notifications
     */
    public static async getNotificationStats(
        companyId?: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<INotificationStats> {
        logger.info(
            { companyId, startDate, endDate },
            "Récupération des statistiques de notifications"
        );

        try {
            const whereClause: any = {};

            if (companyId) {
                whereClause.company_id = companyId;
            }

            if (startDate || endDate) {
                whereClause.created_at = {};
                if (startDate) whereClause.created_at.gte = startDate;
                if (endDate) whereClause.created_at.lte = endDate;
            }

            const stats = await prisma.emailNotification.groupBy({
                by: ["status"],
                where: whereClause,
                _count: {
                    notification_id: true,
                },
            });

            const result: INotificationStats = {
                total: 0,
                sent: 0,
                delivered: 0,
                opened: 0,
                clicked: 0,
                bounced: 0,
                failed: 0,
                pending: 0,
            };

            stats.forEach((stat) => {
                const count = stat._count.notification_id;
                result.total += count;

                switch (stat.status) {
                    case NotificationStatus.sent:
                        result.sent = count;
                        break;
                    case NotificationStatus.delivered:
                        result.delivered = count;
                        break;
                    case NotificationStatus.opened:
                        result.opened = count;
                        break;
                    case NotificationStatus.clicked:
                        result.clicked = count;
                        break;
                    case NotificationStatus.bounced:
                        result.bounced = count;
                        break;
                    case NotificationStatus.failed:
                        result.failed = count;
                        break;
                    case NotificationStatus.pending:
                        result.pending = count;
                        break;
                }
            });

            return result;
        } catch (error) {
            logger.error(
                { error, companyId, startDate, endDate },
                "Erreur lors de la récupération des statistiques"
            );
            throw new CustomError(
                "Erreur lors de la récupération des statistiques",
                500
            );
        }
    }

    /**
     * Récupère l'historique des notifications avec filtres
     */
    public static async getNotificationHistory(filter: INotificationFilter) {
        logger.info(
            { filter },
            "Récupération de l'historique des notifications"
        );

        try {
            const whereClause: any = {};

            if (filter.type) whereClause.type = filter.type;
            if (filter.status) whereClause.status = filter.status;
            if (filter.userId) whereClause.user_id = filter.userId;
            if (filter.companyId) whereClause.company_id = filter.companyId;
            if (filter.recipientEmail)
                whereClause.recipient_email = filter.recipientEmail;

            if (filter.startDate || filter.endDate) {
                whereClause.created_at = {};
                if (filter.startDate)
                    whereClause.created_at.gte = filter.startDate;
                if (filter.endDate) whereClause.created_at.lte = filter.endDate;
            }

            const page = filter.page || 1;
            const limit = filter.limit || 20;
            const skip = (page - 1) * limit;

            const [notifications, total] = await Promise.all([
                prisma.emailNotification.findMany({
                    where: whereClause,
                    orderBy: { created_at: "desc" },
                    skip,
                    take: limit,
                    include: {
                        user: {
                            select: {
                                first_name: true,
                                last_name: true,
                                email: true,
                            },
                        },
                        customer: {
                            select: {
                                email: true,
                                individual: {
                                    select: {
                                        first_name: true,
                                        last_name: true,
                                    },
                                },
                                business: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                }),
                prisma.emailNotification.count({ where: whereClause }),
            ]);

            return {
                notifications,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            logger.error(
                { error, filter },
                "Erreur lors de la récupération de l'historique"
            );
            throw new CustomError(
                "Erreur lors de la récupération de l'historique",
                500
            );
        }
    }
}
