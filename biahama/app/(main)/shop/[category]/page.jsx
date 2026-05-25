import { redirect } from 'next/navigation'

export default async function CategoryPage({ params }) {
  const { category } = await params
  let slug = category.toLowerCase()

  // Map singular/plural/pant and dropdown categories to normalized DB categories
  if (slug === 'kurta' || slug === 'dresses' || slug === 'sets') slug = 'kurtas'
  if (slug === 'pant' || slug === 'pants') slug = 'trousers'

  redirect(`/shop?cat=${slug}`)
}
