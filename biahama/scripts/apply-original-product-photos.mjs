// Dry run by default. Uploads have already been saved under new Cloudinary IDs.
// Change only image URLs, keeping product IDs, photo order and existing assets.
// Local review: DATABASE_URL=<local test URL> node scripts/apply-original-product-photos.mjs --apply
// Production: node scripts/apply-original-product-photos.mjs --project <confirmed Supabase ref> --apply
// Add --rollback to restore previous URLs. Rebuild/revalidate product pages afterward.
import { readFile } from 'node:fs/promises'
import { config } from 'dotenv'
import { Prisma, PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const args = process.argv.slice(2)
const option = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined
config({ path: option('--env') || '.env.local', quiet: true })
const target = new URL(process.env.DATABASE_URL)
const local = ['127.0.0.1', 'localhost'].includes(target.hostname)
if (local && target.pathname !== '/biahama_test') throw new Error('Local updates require the isolated biahama_test database')
const project = option('--project')
if (!local && (!project || !`${target.hostname} ${decodeURIComponent(target.username)}`.includes(project))) {
  throw new Error('Production updates require --project with the confirmed Supabase ref matching DATABASE_URL')
}
const manifest = JSON.parse(await readFile(new URL('./data/uncropped-product-photos-20261015.json', import.meta.url), 'utf8'))
const photos = manifest.photos
if (!Array.isArray(photos) || !photos.length || new Set(photos.map(p => p.imageId)).size !== photos.length) throw new Error('Invalid photo manifest')
for (const photo of photos) {
  for (const value of [photo.url, photo.previousUrl]) {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || url.username || url.password || url.port || !url.pathname.startsWith(`/${manifest.cloudName}/image/upload/`)) throw new Error('Unexpected photo origin')
  }
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 15000 }) })
try {
  const current = await db.productImage.findMany({ where: { id: { in: photos.map(p => p.imageId) } }, select: { id: true, productId: true, url: true } })
  const rollback = args.includes('--rollback')
  const changes = []
  for (const photo of photos) {
    const image = current.find(image => image.id === photo.imageId)
    const expected = rollback ? photo.url : photo.previousUrl
    const destination = rollback ? photo.previousUrl : photo.url
    if (!image || image.productId !== photo.productId) throw new Error(`Photo identity mismatch for ${photo.slug}`)
    if (image.url === destination) continue
    if (image.url !== expected) throw new Error(`Photo changed since review: ${photo.slug}. No updates applied.`)
    changes.push({ id: image.id, productId: image.productId, expected, destination })
  }
  const apply = args.includes('--apply')
  if (apply && changes.length) await db.$transaction(async tx => {
    // One parameterized statement avoids a network round trip per photograph.
    const values = Prisma.join(changes.map(change => Prisma.sql`(${change.id}::text, ${change.productId}::text, ${change.expected}::text, ${change.destination}::text)`))
    const updated = await tx.$executeRaw`
      UPDATE "ProductImage" AS photo SET url = changes.destination
      FROM (VALUES ${values}) AS changes(id, "productId", expected, destination)
      WHERE photo.id = changes.id AND photo."productId" = changes."productId" AND photo.url = changes.expected
    `
    if (updated !== changes.length) throw new Error('Photo changed during update; all URL changes rolled back')
  }, { timeout: 30000 })
  console.log(JSON.stringify({ target: local ? 'isolated local preview' : project, mode: apply ? 'applied' : 'dry run', action: rollback ? 'restore previous URLs' : 'restore original framing', photos: changes.length, existingAssetsDeleted: false }))
} finally {
  await db.$disconnect()
}
