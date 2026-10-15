import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function getTransport() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.EMAIL_FROM) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === "true",
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
}

export function createVerificationToken() {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  };
}

export function hashVerificationToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function createVerificationUrl(token) {
  const url = new URL("/auth/verify-email", env.FRONTEND_ORIGIN);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function sendVerificationEmail({ email, name, token }) {
  const verificationUrl = createVerificationUrl(token);
  const transport = getTransport();

  if (!transport) {
    if (env.NODE_ENV === "production") {
      throw new Error("Email delivery is not configured");
    }
    console.info(`Development email verification link for ${email}: ${verificationUrl}`);
    return { delivered: false, verificationUrl };
  }

  await transport.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: "Verify your Inventra email",
    text: `Hi ${name},\n\nVerify your Inventra account using this link (valid for 24 hours):\n${verificationUrl}\n\nIf you did not create this account, you can ignore this email.`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>Verify your Inventra account using the link below. It is valid for 24 hours.</p><p><a href="${verificationUrl}">Verify email</a></p><p>If you did not create this account, you can ignore this email.</p>`,
  });

  return { delivered: true };
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[character];
  });
}
