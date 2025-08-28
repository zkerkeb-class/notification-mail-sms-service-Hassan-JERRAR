import * as SibApiV3Sdk from "@getbrevo/brevo";
import { IncomingMessage } from "http";
import logger from "../utils/logger";
import { CustomError } from "../utils/customError";
import {
    IEmailSender,
    IEmailRecipient,
    IEmailAttachment,
    ISendEmailRequest,
} from "../interfaces/notification.interface";

class EmailService {
    private apiInstance: SibApiV3Sdk.TransactionalEmailsApi;

    constructor() {
        logger.info("Initialisation du service email Brevo");
        this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

        const apiKey = process.env.BREVO_API_KEY;
        if (!apiKey) {
            logger.error(
                "BREVO_API_KEY manquante dans les variables d'environnement"
            );
            throw new Error(
                "BREVO_API_KEY is not defined in environment variables"
            );
        }

        this.apiInstance.setApiKey(
            SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
            apiKey
        );
        logger.info("Service email Brevo initialisé avec succès");
    }

    /**
     * Envoi d'un email standard
     */
    async sendEmail(
        to: IEmailRecipient[],
        subject: string,
        htmlContent: string,
        textContent?: string,
        sender: IEmailSender = {
            name: "ZenBilling Notifications",
            email: "notifications@zenbilling.com",
        },
        cc?: IEmailRecipient[],
        bcc?: IEmailRecipient[]
    ): Promise<{
        response: IncomingMessage;
        body: SibApiV3Sdk.CreateSmtpEmail;
    }> {
        logger.info(
            {
                to: to.map((r) => r.email),
                subject,
                hasCC: !!cc?.length,
                hasBCC: !!bcc?.length,
            },
            "Envoi d'email standard"
        );

        try {
            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

            sendSmtpEmail.subject = subject;
            sendSmtpEmail.htmlContent = htmlContent;
            if (textContent) {
                sendSmtpEmail.textContent = textContent;
            }
            sendSmtpEmail.sender = sender;
            sendSmtpEmail.to = to.map((recipient) => ({
                email: recipient.email,
                name: recipient.name,
            }));

            if (cc && cc.length > 0) {
                sendSmtpEmail.cc = cc.map((recipient) => ({
                    email: recipient.email,
                    name: recipient.name,
                }));
            }

            if (bcc && bcc.length > 0) {
                sendSmtpEmail.bcc = bcc.map((recipient) => ({
                    email: recipient.email,
                    name: recipient.name,
                }));
            }

            const result = await this.apiInstance.sendTransacEmail(
                sendSmtpEmail
            );

            logger.info(
                {
                    to: to.map((r) => r.email),
                    subject,
                    messageId: result.body.messageId,
                },
                "Email envoyé avec succès"
            );
            return result;
        } catch (error) {
            logger.error(
                { error, to: to.map((r) => r.email), subject },
                "Erreur lors de l'envoi de l'email"
            );
            throw new CustomError("Échec de l'envoi de l'email", 500);
        }
    }

    /**
     * Envoi d'un email avec template Brevo
     */
    async sendTemplateEmail(
        to: IEmailRecipient[],
        templateId: number,
        params: { [key: string]: any },
        sender: IEmailSender = {
            name: "ZenBilling Notifications",
            email: "notifications@zenbilling.com",
        },
        cc?: IEmailRecipient[],
        bcc?: IEmailRecipient[]
    ): Promise<{
        response: IncomingMessage;
        body: SibApiV3Sdk.CreateSmtpEmail;
    }> {
        logger.info(
            {
                to: to.map((r) => r.email),
                templateId,
                hasParams: Object.keys(params).length > 0,
            },
            "Envoi d'email avec template Brevo"
        );

        try {
            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

            sendSmtpEmail.templateId = templateId;
            sendSmtpEmail.sender = sender;
            sendSmtpEmail.to = to.map((recipient) => ({
                email: recipient.email,
                name: recipient.name,
            }));
            sendSmtpEmail.params = params;

            if (cc && cc.length > 0) {
                sendSmtpEmail.cc = cc.map((recipient) => ({
                    email: recipient.email,
                    name: recipient.name,
                }));
            }

            if (bcc && bcc.length > 0) {
                sendSmtpEmail.bcc = bcc.map((recipient) => ({
                    email: recipient.email,
                    name: recipient.name,
                }));
            }

            const result = await this.apiInstance.sendTransacEmail(
                sendSmtpEmail
            );

            logger.info(
                {
                    to: to.map((r) => r.email),
                    templateId,
                    messageId: result.body.messageId,
                },
                "Email avec template envoyé avec succès"
            );
            return result;
        } catch (error) {
            logger.error(
                { error, to: to.map((r) => r.email), templateId },
                "Erreur lors de l'envoi de l'email avec template"
            );
            throw new CustomError(
                "Échec de l'envoi de l'email avec template",
                500
            );
        }
    }

    /**
     * Envoi d'un email avec pièce jointe
     */
    async sendEmailWithAttachment(
        to: IEmailRecipient[],
        subject: string,
        htmlContent: string,
        attachments: IEmailAttachment[],
        textContent?: string,
        sender: IEmailSender = {
            name: "ZenBilling Notifications",
            email: "notifications@zenbilling.com",
        },
        cc?: IEmailRecipient[],
        bcc?: IEmailRecipient[]
    ): Promise<{
        response: IncomingMessage;
        body: SibApiV3Sdk.CreateSmtpEmail;
    }> {
        logger.info(
            {
                to: to.map((r) => r.email),
                subject,
                attachmentCount: attachments.length,
                attachmentNames: attachments.map((a) => a.filename),
            },
            "Envoi d'email avec pièces jointes"
        );

        try {
            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

            sendSmtpEmail.subject = subject;
            sendSmtpEmail.htmlContent = htmlContent;
            if (textContent) {
                sendSmtpEmail.textContent = textContent;
            }
            sendSmtpEmail.sender = sender;
            sendSmtpEmail.to = to.map((recipient) => ({
                email: recipient.email,
                name: recipient.name,
            }));

            if (cc && cc.length > 0) {
                sendSmtpEmail.cc = cc.map((recipient) => ({
                    email: recipient.email,
                    name: recipient.name,
                }));
            }

            if (bcc && bcc.length > 0) {
                sendSmtpEmail.bcc = bcc.map((recipient) => ({
                    email: recipient.email,
                    name: recipient.name,
                }));
            }

            // Convertir les pièces jointes au format Brevo
            sendSmtpEmail.attachment = attachments.map((attachment) => ({
                content: Buffer.isBuffer(attachment.content)
                    ? attachment.content.toString("base64")
                    : attachment.content,
                name: attachment.filename,
            }));

            const result = await this.apiInstance.sendTransacEmail(
                sendSmtpEmail
            );

            logger.info(
                {
                    to: to.map((r) => r.email),
                    subject,
                    attachmentCount: attachments.length,
                    messageId: result.body.messageId,
                },
                "Email avec pièces jointes envoyé avec succès"
            );
            return result;
        } catch (error) {
            logger.error(
                {
                    error,
                    to: to.map((r) => r.email),
                    subject,
                    attachmentCount: attachments.length,
                },
                "Erreur lors de l'envoi de l'email avec pièces jointes"
            );
            throw new CustomError(
                "Échec de l'envoi de l'email avec pièces jointes",
                500
            );
        }
    }

    /**
     * Envoi d'emails en lot (bulk)
     */
    async sendBulkEmails(requests: ISendEmailRequest[]): Promise<void> {
        logger.info(
            { count: requests.length },
            "Début d'envoi d'emails en lot"
        );

        const promises = requests.map(async (request) => {
            try {
                if (request.templateId) {
                    return await this.sendTemplateEmail(
                        request.to,
                        parseInt(request.templateId),
                        request.templateVariables || {},
                        request.sender,
                        request.cc,
                        request.bcc
                    );
                } else if (
                    request.attachments &&
                    request.attachments.length > 0
                ) {
                    return await this.sendEmailWithAttachment(
                        request.to,
                        request.subject,
                        request.htmlContent || "",
                        request.attachments,
                        request.textContent,
                        request.sender,
                        request.cc,
                        request.bcc
                    );
                } else {
                    return await this.sendEmail(
                        request.to,
                        request.subject,
                        request.htmlContent || "",
                        request.textContent,
                        request.sender,
                        request.cc,
                        request.bcc
                    );
                }
            } catch (error) {
                logger.error(
                    {
                        error,
                        to: request.to.map((r) => r.email),
                        subject: request.subject,
                    },
                    "Erreur lors de l'envoi d'un email dans le lot"
                );
                throw error;
            }
        });

        try {
            await Promise.all(promises);
            logger.info(
                { count: requests.length },
                "Tous les emails du lot envoyés avec succès"
            );
        } catch (error) {
            logger.error(
                { error, count: requests.length },
                "Erreur lors de l'envoi d'emails en lot"
            );
            throw new CustomError("Échec de l'envoi d'emails en lot", 500);
        }
    }
}

export default new EmailService();
