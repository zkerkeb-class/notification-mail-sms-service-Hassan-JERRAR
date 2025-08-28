export interface IEmailSender {
    name: string;
    email: string;
}

export interface IEmailRecipient {
    name?: string;
    email: string;
}

export interface IEmailAttachment {
    filename: string;
    content: Buffer | string;
    contentType?: string;
    encoding?: string;
}

export interface ISendEmailRequest {
    to: IEmailRecipient[];
    cc?: IEmailRecipient[];
    bcc?: IEmailRecipient[];
    subject: string;
    htmlContent?: string;
    textContent?: string;
    sender?: IEmailSender;
    attachments?: IEmailAttachment[];
    templateId?: string;
    templateVariables?: Record<string, any>;
    priority?: number;
    scheduledAt?: Date;
    metadata?: Record<string, any>;
}

export interface ISendInvoiceEmailRequest {
    invoiceId: string;
    companyId: string;
    userId: string;
    includePaymentLink?: boolean;
    customMessage?: string;
    scheduledAt?: Date;
}

export interface ISendQuoteEmailRequest {
    quoteId: string;
    companyId: string;
    userId: string;
    customMessage?: string;
    scheduledAt?: Date;
}

export interface ISendBulkEmailRequest {
    templateId?: string;
    subject: string;
    htmlContent?: string;
    textContent?: string;
    recipients: IEmailRecipient[];
    sender?: IEmailSender;
    templateVariables?: Record<string, any>;
    scheduledAt?: Date;
    priority?: number;
}

export interface IEmailTemplateRequest {
    name: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
    type: string;
    variables?: Record<string, any>;
}

export interface INotificationResponse {
    notificationId: string;
    status: string;
    message: string;
    sentAt?: Date;
    externalId?: string;
}

export interface INotificationStats {
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
    pending: number;
}

export interface INotificationFilter {
    type?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    companyId?: string;
    recipientEmail?: string;
    page?: number;
    limit?: number;
}
