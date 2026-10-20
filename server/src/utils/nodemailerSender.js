
const nodemailer = require('nodemailer');
const { createOTPEmail } = require('./emailTemplate');

async function sendWithNodemailer(email, otp) {
    const { subject, html, text } = createOTPEmail(otp);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        connectionTimeout: 3000,
        greetingTimeout: 3000,
        socketTimeout: 5000
    });

    try {
        await transporter.sendMail({
            from: `"ChatHouse" <${process.env.EMAIL_USER}>`,
            to: email,
            subject,
            text,
            html
        });
    } finally {
        transporter.close();
    }
}

module.exports = { sendWithNodemailer };
