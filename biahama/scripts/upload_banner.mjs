import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import cloudinary from 'cloudinary'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env.local') })

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
})

async function upload() {
  try {
    const res = await cloudinary.v2.uploader.upload(
      '/Users/soundariyanvenkatachalam/Desktop/Biahama/images and pdf/shirt/Navy Linen Column shirt/1.png',
      {
        public_id: 'shirts-banner',
        folder: 'biahama/banners',
        overwrite: true,
        format: 'webp',
        transformation: [
          { width: 1600, crop: 'scale' },
          { quality: 'auto:best', fetch_format: 'auto' }
        ]
      }
    )
    console.log(res.secure_url)
  } catch (err) {
    console.error(err)
  }
}
upload()
