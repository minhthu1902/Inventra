import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { clearAuthCookie, setAuthCookie } from "./authCookies.js";
import { User } from "../models/User.js";
import {
  createVerificationToken,
  hashVerificationToken,
  sendVerificationEmail,
} from "./emailVerification.js";

const BCRYPT_ROUNDS = 12;

function createSessionToken(user) {
  return jwt.sign({ sub: user.id }, env.JWT_SECRET, { expiresIn: "7d" });
}

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

export async function signUp(request, response) {
  const { name, email, password } = request.validatedBody;
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const verification = createVerificationToken();

  try {
    const user = await User.create({
      name,
      email,
      passwordHash,
      emailVerificationTokenHash: verification.tokenHash,
      emailVerificationExpiresAt: verification.expiresAt,
    });
    let delivery;
    try {
      delivery = await sendVerificationEmail({
        email,
        name,
        token: verification.token,
      });
    } catch {
      return response.status(503).json({
        code: "EMAIL_DELIVERY_FAILED",
        message:
          "Your account was created, but the verification email could not be sent. Configure email delivery or try resending.",
      });
    }
    return response.status(201).json({
      message:
        "Account created. Check your email for a verification link before signing in.",
      email: user.email,
      ...(delivery.verificationUrl
        ? { verificationUrl: delivery.verificationUrl }
        : {}),
    });
  } catch (error) {
    if (error.code === 11000) {
      return response
        .status(409)
        .json({ message: "An account with this email already exists" });
    }
    throw error;
  }
}

export async function signIn(request, response) {
  const { email, password } = request.validatedBody;
  const user = await User.findOne({ email }).select("+passwordHash");
  const passwordMatches = user
    ? await bcrypt.compare(password, user.passwordHash)
    : false;

  if (!user || !passwordMatches) {
    return response
      .status(401)
      .json({ message: "Email or password is incorrect" });
  }
  if (!user.emailVerified) {
    return response.status(403).json({
      code: "EMAIL_NOT_VERIFIED",
      message: "Verify your email before signing in.",
    });
  }

  setAuthCookie(response, createSessionToken(user));
  return response.status(200).json({ user: toPublicUser(user) });
}

export async function verifyEmail(request, response) {
  const tokenHash = hashVerificationToken(request.validatedBody.token);
  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpiresAt: { $gt: new Date() },
  }).select("+emailVerificationTokenHash +emailVerificationExpiresAt");

  if (!user) {
    return response
      .status(400)
      .json({ message: "Verification link is invalid or expired." });
  }

  user.emailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  await user.save();
  return response
    .status(200)
    .json({ message: "Email verified. You can now sign in." });
}

export async function resendVerificationEmail(request, response) {
  const { email } = request.validatedBody;
  const user = await User.findOne({ email });

  if (!user || user.emailVerified) {
    return response.status(200).json({
      message:
        "If an unverified account exists for that email, a new verification link will be sent.",
    });
  }

  const verification = createVerificationToken();
  user.emailVerificationTokenHash = verification.tokenHash;
  user.emailVerificationExpiresAt = verification.expiresAt;
  await user.save();
  let delivery;
  try {
    delivery = await sendVerificationEmail({
      email: user.email,
      name: user.name,
      token: verification.token,
    });
  } catch {
    return response.status(503).json({
      code: "EMAIL_DELIVERY_FAILED",
      message:
        "The verification email could not be sent. Check your email settings and try again.",
    });
  }

  return response.status(200).json({
    message:
      "If an unverified account exists for that email, a new verification link will be sent.",
    ...(delivery.verificationUrl
      ? { verificationUrl: delivery.verificationUrl }
      : {}),
  });
}

export async function signOut(_request, response) {
  clearAuthCookie(response);
  return response.status(200).json({ message: "Signed out" });
}

export async function getCurrentUser(request, response) {
  const user = await User.findById(request.auth.userId);
  if (!user) {
    clearAuthCookie(response);
    return response.status(401).json({ message: "Authentication required" });
  }
  return response.status(200).json({ user: toPublicUser(user) });
}
