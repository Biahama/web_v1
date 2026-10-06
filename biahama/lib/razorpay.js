import Razorpay from 'razorpay'

let _client = null

export function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw Object.assign(new Error('Online payments are temporarily unavailable'), { statusCode: 503 })
  }
  if (!_client) {
    _client = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
    _client.api.rq.defaults.timeout = 10000
  }
  return _client
}
