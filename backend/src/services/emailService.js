const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
}

async function sendMail(data) {
  if (!data || !data.to) {
    return;
  }
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const transport = getTransporter();
  const from = process.env.MAIL_FROM || 'no-reply@eventspace.tn';

  if (!transport) {
    console.log('[e-mail] ' + data.subject + ' -> ' + data.to);
    return;
  }

  await transport.sendMail({
    from: from,
    to: data.to,
    subject: data.subject,
    html: data.html,
  });
}

module.exports = { sendMail };
