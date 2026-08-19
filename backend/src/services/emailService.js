const nodemailer = require('nodemailer');

let transporter = null;

const initTransporter = async () => {
    if (transporter) return transporter;

    if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
        // Use provided SMTP settings
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        console.log('📧 Nodemailer configured with standard SMTP');
    } else {
        // Fallback to Ethereal Email for development/testing
        console.log('⚠️ No SMTP settings found, creating Ethereal Test Account...');
        try {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
            console.log(`📧 Nodemailer configured with Ethereal Email (User: ${testAccount.user})`);
        } catch (e) {
            console.error('Failed to create Ethereal test account:', e);
        }
    }
    return transporter;
};

const sendEmail = async (to, subject, text, html) => {
    try {
        const mailTransporter = await initTransporter();
        if (!mailTransporter) throw new Error("Mail transporter not initialized");

        const info = await mailTransporter.sendMail({
            from: process.env.SMTP_FROM || '"MeshPay" <noreply@meshpay.test>',
            to,
            subject,
            text,
            html,
        });

        console.log(`Message sent: ${info.messageId}`);
        // Log Ethereal URL if using Ethereal
        if (!process.env.SMTP_HOST) {
            console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        }
        return info;
    } catch (error) {
        console.error("Error sending email: ", error);
        throw error;
    }
};

module.exports = {
    sendEmail
};
