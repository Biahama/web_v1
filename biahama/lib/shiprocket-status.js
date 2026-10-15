// Shiprocket distinguishes Delivered from Undelivered, Partial_Delivered and
// RTO Delivered. Only the exact successful forward-delivery label qualifies.
// Provider reference: https://apidocs.shiprocket.in/ (shipment status codes).
export function isSuccessfulDelivery(status) {
  return typeof status === 'string' && status.trim().toLowerCase() === 'delivered'
}
