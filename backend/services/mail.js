import nodemailer from 'nodemailer'
import dotenv from "dotenv";

dotenv.config();
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SYSTEM_EMAIL,
    pass: process.env.GOOGLE_APP_PASSWORD,
  },
});

const sendMail = async (to, html, subject, attachments = []) => {
    await transporter.sendMail({
        from: `"Felicity Management System" <${process.env.SYSTEM_EMAIL}>`,
        to,
        subject,
        html,
        attachments
    });
};

export {
    sendMail,
}