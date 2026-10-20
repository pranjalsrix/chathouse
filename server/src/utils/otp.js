// Simple in-memory OTP store
// Each entry: { otp, expiresAt, attempts, lastSent }
const otpStore = new Map();

const OTP_EXPIRY_MS = 5 * 60 * 1000;       // 5 minutes
const RATE_LIMIT_MS = 10 * 60 * 1000;       // 10 minutes window
const MAX_REQUESTS = 3;                       // max OTPs per window

// Generate a 6-digit numeric OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTP for email (with rate limiting check)
function saveOTP(email) {
  const existing = otpStore.get(email);
  const now = Date.now();

  // Rate limiting: reset window if expired
  if (existing && now - existing.windowStart > RATE_LIMIT_MS) {
    otpStore.delete(email);
  }

  const current = otpStore.get(email) || { count: 0, windowStart: now };

  if (current.count >= MAX_REQUESTS) {
    const waitMs = RATE_LIMIT_MS - (now - current.windowStart);
    const waitMin = Math.ceil(waitMs / 60000);
    throw new Error(`Too many OTP requests. Try again in ${waitMin} minute(s).`);
  }

  const otp = generateOTP();
  otpStore.set(email, {
    otp,
    expiresAt: now + OTP_EXPIRY_MS,
    count: current.count + 1,
    windowStart: current.windowStart
  });

  return otp;
}

// Verify OTP for email
function verifyOTP(email, inputOtp) {
  const entry = otpStore.get(email);
  if (!entry) return { valid: false, reason: 'No OTP found. Please request a new one.' };
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(email);
    return { valid: false, reason: 'OTP has expired. Please request a new one.' };
  }
  if (entry.otp !== inputOtp) {
    return { valid: false, reason: 'Invalid OTP. Please try again.' };
  }
  otpStore.delete(email); // OTP used, remove it
  return { valid: true };
}

module.exports = { saveOTP, verifyOTP };
