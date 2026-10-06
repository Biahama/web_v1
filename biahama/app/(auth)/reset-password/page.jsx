import PasswordForm from '@/components/auth/PasswordForm'
export const metadata = { title: 'Choose a new password', robots: { index: false, follow: false } }
export default function ResetPasswordPage() { return <PasswordForm reset /> }
