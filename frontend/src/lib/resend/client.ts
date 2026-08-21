import { Resend } from "resend";
import { requireResendEnv } from "./env";

let cached: Resend | null = null;

export function getResendClient() {
  const { apiKey } = requireResendEnv(process.env.RESEND_API_KEY, process.env.RESEND_FROM_EMAIL);
  if (!cached) {
    cached = new Resend(apiKey);
  }
  return cached;
}

export function getResendFrom() {
  return requireResendEnv(process.env.RESEND_API_KEY, process.env.RESEND_FROM_EMAIL).from;
}
