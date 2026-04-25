import * as Brevo from '@getbrevo/brevo'

const client = Brevo.ApiClient.instance
client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY

export const transactionalEmailsApi = new Brevo.TransactionalEmailsApi()

export async function sendTransactionalEmail({ to, subject, templateId, params }) {
  const email = new Brevo.SendSmtpEmail()
  email.to = [{ email: to }]
  email.subject = subject
  email.templateId = templateId
  email.params = params
  return transactionalEmailsApi.sendTransacEmail(email)
}
