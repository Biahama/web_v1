export const PAYMENT_ENV = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'CRON_SECRET']
export const REQUIRED_ENV = ['DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'ADMIN_EMAILS', ...PAYMENT_ENV, 'BREVO_API_KEY', 'BREVO_SENDER_EMAIL']
export function missingEnvironment(env, required = REQUIRED_ENV) { return required.filter(key => !env[key]?.trim()) }
