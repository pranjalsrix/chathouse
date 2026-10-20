
const { createOTPEmail } = require('./emailTemplate');

async function sendWithAppsScript(email, otp) {
    const url = process.env.GOOGLE_APPS_SCRIPT_URL;
    const secret = process.env.GOOGLE_APPS_SCRIPT_SECRET;

    if (!url || !secret) {
        throw new Error('Google Apps Script configuration is missing');
    }

    const { subject, html, text } = createOTPEmail(otp);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            secret,
            to: email,
            otp: String(otp),
            subject,
            html,
            text
        }),
        signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
        throw new Error(`Apps Script returned HTTP ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
        throw new Error(result.error || 'Apps Script email failed');
    }
}

module.exports = { sendWithAppsScript };
