import puppeteer from "puppeteer";
import * as handlebars from "handlebars";
import * as fs from "fs";
import * as path from "path";
import logger from "../utils/logger";
import prisma from "../lib/prisma";
import { CustomError } from "../utils/customError";

// Types utiles pour les templates
type VatRate = "ZERO" | "REDUCED_1" | "REDUCED_2" | "REDUCED_3" | "STANDARD";
type ProductUnit =
    | "unite"
    | "kg"
    | "g"
    | "l"
    | "ml"
    | "m"
    | "cm"
    | "m2"
    | "cm2"
    | "m3"
    | "h"
    | "jour"
    | "mois"
    | "annee";

// Utilitaire pour convertir VatRate en valeur numérique
export const vatRateToNumber = (vatRate: VatRate): number => {
    const mapping = {
        ZERO: 0.0,
        REDUCED_1: 2.1,
        REDUCED_2: 5.5,
        REDUCED_3: 10.0,
        STANDARD: 20.0,
    };
    return mapping[vatRate];
};

interface HandlebarsContext {
    [key: string]: any;
}

export class PdfService {
    private static templatePath = path.join(
        __dirname,
        "../templates/invoice.template.html"
    );
    private static quoteTemplatePath = path.join(
        __dirname,
        "../templates/quote.template.html"
    );

    private static registerHelpers() {
        logger.debug("Enregistrement des helpers Handlebars");

        handlebars.registerHelper("formatDate", function (date: Date) {
            return new Date(date).toLocaleDateString("fr-FR");
        });

        handlebars.registerHelper("formatPrice", function (price: number) {
            return price.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        });

        handlebars.registerHelper(
            "if_eq",
            function (
                this: HandlebarsContext,
                a: any,
                b: any,
                opts: handlebars.HelperOptions
            ) {
                if (a === b) {
                    return opts.fn(this);
                }
                return opts.inverse?.(this) || "";
            }
        );

        handlebars.registerHelper(
            "if_true",
            function (
                this: HandlebarsContext,
                a: any,
                opts: handlebars.HelperOptions
            ) {
                if (a) {
                    return opts.fn(this);
                }
                return opts.inverse?.(this) || "";
            }
        );

        handlebars.registerHelper(
            "if_false",
            function (
                this: HandlebarsContext,
                a: any,
                opts: handlebars.HelperOptions
            ) {
                if (!a) {
                    return opts.fn(this);
                }
                return opts.inverse?.(this) || "";
            }
        );

        handlebars.registerHelper(
            "if_not_empty",
            function (
                this: HandlebarsContext,
                a: any,
                opts: handlebars.HelperOptions
            ) {
                if (a && a !== "") {
                    return opts.fn(this);
                }
                return opts.inverse?.(this) || "";
            }
        );

        handlebars.registerHelper(
            "if_not_null",
            function (
                this: HandlebarsContext,
                a: any,
                opts: handlebars.HelperOptions
            ) {
                if (a !== null && a !== undefined) {
                    return opts.fn(this);
                }
                return opts.inverse?.(this) || "";
            }
        );

        handlebars.registerHelper("getItemName", function (item: any) {
            return item.product ? item.product.name : item.name;
        });

        handlebars.registerHelper("getItemDescription", function (item: any) {
            const description = item.product
                ? item.product.description
                : item.description;
            return description || "";
        });

        handlebars.registerHelper("getItemUnit", function (item: any) {
            return item.product ? item.product.unit : item.unit;
        });

        logger.debug("Helpers Handlebars enregistrés avec succès");
    }

    public static async generateInvoicePdf(invoiceId: string): Promise<Buffer> {
        logger.info({ invoiceId }, "Début de la génération du PDF de facture");

        try {
            // Récupérer toutes les données nécessaires
            const invoice = await prisma.invoice.findUnique({
                where: {
                    invoice_id: invoiceId,
                },
                include: {
                    company: true,
                    customer: {
                        include: {
                            individual: true,
                            business: true,
                        },
                    },
                    items: {
                        include: {
                            product: true,
                        },
                    },
                },
            });

            if (!invoice) {
                logger.warn({ invoiceId }, "Facture non trouvée");
                throw new CustomError("Facture non trouvée", 404);
            }

            logger.debug(
                { invoiceId },
                "Préparation des données pour le template"
            );

            // Préparer les données pour le template
            const templateData = {
                invoice: {
                    ...invoice,
                    amount_excluding_tax: Number(invoice.amount_excluding_tax),
                    tax: Number(invoice.tax),
                    amount_including_tax: Number(invoice.amount_including_tax),
                },
                company: invoice.company,
                customer: {
                    ...invoice.customer,
                    ...(invoice.customer?.individual || {}),
                    ...(invoice.customer?.business || {}),
                },
                items: invoice.items?.map((item) => ({
                    ...item,
                    name: item.product ? item.product.name : item.name,
                    description: item.product
                        ? item.product.description
                        : item.description,
                    unit_price_excluding_tax: Number(
                        item.unit_price_excluding_tax
                    ),
                    total_excluding_tax:
                        Number(item.quantity) *
                        Number(item.unit_price_excluding_tax),
                    vat_rate: vatRateToNumber(item.vat_rate as VatRate).toFixed(
                        2
                    ),
                })),
                customer_tva_applicable:
                    invoice.customer?.business?.tva_applicable,
                customer_tva_intra: invoice.customer?.business?.tva_intra,
            };

            logger.debug({ invoiceId }, "Compilation du template");
            const templateHtml = fs.readFileSync(this.templatePath, "utf-8");
            this.registerHelpers();
            const template = handlebars.compile(templateHtml);
            const html = template(templateData);

            logger.debug({ invoiceId }, "Lancement de Puppeteer");
            const browser = await puppeteer.launch({
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
                headless: true,
            });

            const page = await browser.newPage();
            await page.setViewport({
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1,
            });

            logger.debug({ invoiceId }, "Génération du PDF");
            await page.setContent(html, {
                waitUntil: ["networkidle0"],
                timeout: 30000,
            });

            await page.emulateMediaType("screen");

            const pdfBuffer = await page.pdf({
                format: "A4",
                printBackground: true,
                displayHeaderFooter: true,
                headerTemplate: "<span></span>",
                footerTemplate: `
          <div style="width: 100%; font-size: 10px; padding: 10px 20px; color: #666; text-align: center;">
            ${invoice.company?.name} - ${invoice.company?.address}, ${
                    invoice.company?.postal_code
                } ${invoice.company?.city}
            <br>
            SIRET: ${
                invoice.company?.siret || "N/A"
            } - TVA Intracommunautaire: ${invoice.company?.tva_intra || "N/A"}
            <br>
            Page <span class="pageNumber"></span> sur <span class="totalPages"></span>
          </div>
        `,
            });

            await browser.close();
            logger.info({ invoiceId }, "PDF de facture généré avec succès");
            return Buffer.from(pdfBuffer);
        } catch (error) {
            logger.error(
                { error, invoiceId },
                "Erreur lors de la génération du PDF de facture"
            );
            if (error instanceof CustomError) {
                throw error;
            }
            throw new CustomError(
                "Erreur lors de la génération du PDF de facture",
                500
            );
        }
    }

    public static async generateQuotePdf(quoteId: string): Promise<Buffer> {
        logger.info({ quoteId }, "Début de la génération du PDF de devis");

        try {
            const quote = await prisma.quote.findUnique({
                where: {
                    quote_id: quoteId,
                },
                include: {
                    company: true,
                    customer: {
                        include: {
                            individual: true,
                            business: true,
                        },
                    },
                    items: {
                        include: {
                            product: true,
                        },
                    },
                },
            });

            if (!quote) {
                logger.warn({ quoteId }, "Devis non trouvé");
                throw new CustomError("Devis non trouvé", 404);
            }

            logger.debug(
                { quoteId },
                "Préparation des données pour le template"
            );
            const templateData = {
                quote: {
                    ...quote,
                    amount_excluding_tax: Number(quote.amount_excluding_tax),
                    tax: Number(quote.tax),
                    amount_including_tax: Number(quote.amount_including_tax),
                },
                company: quote.company,
                customer: {
                    ...quote.customer,
                    ...(quote.customer?.individual || {}),
                    ...(quote.customer?.business || {}),
                },
                items: quote.items?.map((item) => ({
                    ...item,
                    name: item.product ? item.product.name : item.name,
                    description: item.product
                        ? item.product.description
                        : item.description,
                    unit_price_excluding_tax: Number(
                        item.unit_price_excluding_tax
                    ),
                    total_excluding_tax:
                        Number(item.quantity) *
                        Number(item.unit_price_excluding_tax),
                    vat_rate: vatRateToNumber(item.vat_rate as VatRate).toFixed(
                        2
                    ),
                })),
                customer_tva_applicable:
                    quote.customer?.business?.tva_applicable,
                customer_tva_intra: quote.customer?.business?.tva_intra,
            };

            logger.debug({ quoteId }, "Compilation du template");
            const templateHtml = fs.readFileSync(
                this.quoteTemplatePath,
                "utf-8"
            );
            this.registerHelpers();
            const template = handlebars.compile(templateHtml);
            const html = template(templateData);

            logger.debug({ quoteId }, "Lancement de Puppeteer");
            const browser = await puppeteer.launch({
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
                headless: true,
            });

            const page = await browser.newPage();
            await page.setViewport({
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1,
            });

            logger.debug({ quoteId }, "Génération du PDF");
            await page.setContent(html, {
                waitUntil: ["networkidle0"],
                timeout: 30000,
            });

            await page.emulateMediaType("screen");

            const pdfBuffer = await page.pdf({
                format: "A4",
                printBackground: true,
                displayHeaderFooter: true,
                headerTemplate: "<span></span>",
                footerTemplate: `
          <div style="width: 100%; font-size: 10px; padding: 10px 20px; color: #666; text-align: center;">
            ${quote.company?.name} - ${quote.company?.address}, ${
                    quote.company?.postal_code
                } ${quote.company?.city}
            <br>
            SIRET: ${quote.company?.siret || "N/A"} - TVA Intracommunautaire: ${
                    quote.company?.tva_intra || "N/A"
                }
            <br>
            Page <span class="pageNumber"></span> sur <span class="totalPages"></span>
          </div>
        `,
            });

            await browser.close();
            logger.info({ quoteId }, "PDF de devis généré avec succès");
            return Buffer.from(pdfBuffer);
        } catch (error) {
            logger.error(
                { error, quoteId },
                "Erreur lors de la génération du PDF de devis"
            );
            if (error instanceof CustomError) {
                throw error;
            }
            throw new CustomError(
                "Erreur lors de la génération du PDF de devis",
                500
            );
        }
    }
}
