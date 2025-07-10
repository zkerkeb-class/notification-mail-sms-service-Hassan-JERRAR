import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { NotificationController } from "../controllers/notification.controller";

const router = Router();

// Routes pour l'envoi d'emails
router.post("/send", authMiddleware, NotificationController.sendEmail);
router.post(
    "/send-bulk",
    authMiddleware,
    NotificationController.sendBulkEmails
);

// Routes pour l'envoi de factures et devis
router.post(
    "/invoice/:invoiceId/send",
    authMiddleware,
    NotificationController.sendInvoiceEmail
);
router.post(
    "/quote/:quoteId/send",
    authMiddleware,
    NotificationController.sendQuoteEmail
);

// Routes pour les statistiques et l'historique
router.get("/stats", authMiddleware, NotificationController.getStats);
router.get("/history", authMiddleware, NotificationController.getHistory);
router.get(
    "/:notificationId",
    authMiddleware,
    NotificationController.getNotification
);

// Routes pour la gestion des templates
router.get("/templates", authMiddleware, NotificationController.getTemplates);
router.post(
    "/templates",
    authMiddleware,
    NotificationController.createTemplate
);
router.put(
    "/templates/:templateId",
    authMiddleware,
    NotificationController.updateTemplate
);
router.delete(
    "/templates/:templateId",
    authMiddleware,
    NotificationController.deleteTemplate
);

// Routes pour les webhooks (pas d'authentification requise)
router.post("/webhooks/brevo", NotificationController.handleBrevoWebhook);

export default router;
