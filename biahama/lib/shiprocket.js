import axios from 'axios'

const BASE = 'https://apiv2.shiprocket.in/v1/external'

let token = null
let tokenExpiry = 0

async function getToken() {
  if (token && Date.now() < tokenExpiry) return token

  const { data } = await axios.post(`${BASE}/auth/login`, {
    email:    process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
  })

  token = data.token
  // tokens last 24h; refresh after 23h
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000
  return token
}

export async function shiprocket(method, path, body) {
  const t = await getToken()
  const { data } = await axios({ method, url: `${BASE}${path}`, data: body, headers: { Authorization: `Bearer ${t}` } })
  return data
}
