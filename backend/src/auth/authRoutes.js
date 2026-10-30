import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import {
  getCurrentUser,
  resendVerificationEmail,
  signIn,
  signOut,
  signUp,
  verifyEmail,
} from "./authController.js";
import {
  resendVerificationSchema,
  signInSchema,
  signUpSchema,
  verifyEmailSchema,
} from "./authSchemas.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validateBody } from "../middleware/validateBody.js";

const router = Router();
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Try again later." },
});

router.post("/signup", authRateLimit, validateBody(signUpSchema), signUp);
router.post("/signin", authRateLimit, validateBody(signInSchema), signIn);
router.post(
  "/verify-email",
  authRateLimit,
  validateBody(verifyEmailSchema),
  verifyEmail,
);
router.post(
  "/resend-verification",
  authRateLimit,
  validateBody(resendVerificationSchema),
  resendVerificationEmail,
);
router.post("/signout", signOut);
router.get("/me", requireAuth, getCurrentUser);

export default router;
