
function createOTPEmail(otp) {
  return {
    subject: `Your ChatHouse OTP: ${otp}`,
    text: `Your ChatHouse login code is ${otp}. It expires in 5 minutes. If you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 12px;">
        <h2 style="color: #111827; font-size: 22px; margin-bottom: 8px;">Your ChatHouse Login Code</h2>
        <p style="color: #6B7280; margin-bottom: 24px;">Use the OTP below to sign in. It expires in 5 minutes.</p>
        <div style="background: #F8FAFC; border: 1px solid #E5E7EB; border-radius: 8px; padding: 24px; text-align: center;">
          <span style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #4F46E5;">${otp}</span>
        </div>
        <p style="color: #6B7280; font-size: 13px; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>
        <p style="color: #9CA3AF; font-size: 12px; margin-top: 8px;">— The ChatHouse Team</p>
      </div>
    `
  };
}

module.exports = { createOTPEmail };
