import { sendEmail } from "./mailtrap";

/**
 * Serviço centralizado de e-mails do NΞØ Protocol.
 * Utiliza os templates configurados no Mailtrap via MCP.
 */

export const EmailService = {
    /**
     * Envia o e-mail de Boas-vindas oficial do protocolo.
     */
    sendWelcome: async (email: string, name: string, userId: string) => {
        const templateUuid = process.env.MAILTRAP_WELCOME_TEMPLATE_ID;
        if (!templateUuid) return console.warn("MAILTRAP_WELCOME_TEMPLATE_ID não definido");

        return sendEmail({
            to: email,
            templateUuid,
            templateVariables: {
                name,
                user_id: userId,
            },
        });
    },

    /**
     * Envia a confirmação de pagamento (Neo Green).
     */
    sendPaymentSuccess: async (email: string, name: string, amount: string, txId: string) => {
        const templateUuid = process.env.MAILTRAP_PAYMENT_SUCCESS_TEMPLATE_ID;
        if (!templateUuid) return console.warn("MAILTRAP_PAYMENT_SUCCESS_TEMPLATE_ID não definido");

        return sendEmail({
            to: email,
            templateUuid,
            templateVariables: {
                name,
                amount,
                transaction_id: txId,
            },
        });
    },

    /**
     * Envia recuperação de senha (Neo Purple).
     */
    sendPasswordReset: async (email: string, resetLink: string, ip: string) => {
        const templateUuid = process.env.MAILTRAP_PASSWORD_RESET_TEMPLATE_ID;
        if (!templateUuid) return console.warn("MAILTRAP_PASSWORD_RESET_TEMPLATE_ID não definido");

        return sendEmail({
            to: email,
            templateUuid,
            templateVariables: {
                reset_link: resetLink,
                ip_address: ip,
            },
        });
    },
};
