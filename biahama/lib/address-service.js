import { z } from 'zod'

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the recipient’s full name').max(100),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  line1: z.string().trim().min(3, 'Enter your house number and street').max(200),
  line2: z.string().trim().max(200).optional(),
  area: z.string().trim().max(120).optional(),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code'),
  city: z.string().trim().min(2, 'Enter your city').max(80),
  district: z.string().trim().max(80).optional(),
  state: z.string().trim().min(2, 'Enter your state').max(80),
  isDefault: z.boolean().optional(),
})
export const addressUpdateSchema = addressSchema.partial().refine(data => Object.keys(data).length > 0, 'No address changes supplied')

export async function saveAddress(db, userId, data, id) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`
    const existing = id ? await tx.address.findFirst({ where: { id, userId } }) : null
    if (id && !existing) throw Object.assign(new Error('Address not found'), { statusCode: 404 })
    const hasDefault = await tx.address.findFirst({ where: { userId, isDefault: true } })
    const isDefault = data.isDefault === true || existing?.isDefault === true || !hasDefault
    if (isDefault) await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } })
    return id
      ? tx.address.update({ where: { id, userId }, data: { ...data, isDefault } })
      : tx.address.create({ data: { ...data, userId, isDefault } })
  })
}

export async function deleteAddress(db, userId, id) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`
    const existing = await tx.address.findFirst({ where: { id, userId } })
    if (!existing) throw Object.assign(new Error('Address not found'), { statusCode: 404 })
    await tx.address.delete({ where: { id, userId } })
    if (existing.isDefault) {
      const replacement = await tx.address.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } })
      if (replacement) await tx.address.update({ where: { id: replacement.id, userId }, data: { isDefault: true } })
    }
  })
}
