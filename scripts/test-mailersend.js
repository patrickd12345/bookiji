// test-mailersend.js
import nodemailer from "nodemailer";

async function main() {
  // 1. Configure SMTP transport
  const transporter = nodemailer.createTransport({
    host: "smtp.mailersend.net",
    port: 587,
    secure: false, // TLS is used but not SSL on 587
    auth: {
      user: "MS_0hxbtC@bookiji.com",   // from MailerSend
      pass: "mssp.sLKhPTo.vywj2lp077147oqz.k9nsVIT",   // from MailerSend
    },
  });

  // 2. Send a test email
  try {
    const info = await transporter.sendMail({
      from: '"Bookiji Test" <no-reply@bookiji.com>', // must match your verified domain
      to: "patrick_duchesneau_1@hotmail.com",            // any mailbox you own
      subject: "MailerSend SMTP test",
      text: "If you see this, MailerSend SMTP works! 🎉",
    });

    console.log("✅ Message sent:", info.messageId);
  } catch (err) {
    console.error("❌ Error sending mail:", err);
  }
}

main();
