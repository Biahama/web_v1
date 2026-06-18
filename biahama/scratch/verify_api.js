const axios = require('axios');

async function main() {
  console.log('--- FETCHING API PRODUCTS FOR KORTAS ---');
  try {
    const res = await axios.get('http://localhost:3000/api/products?category=kurtas');
    console.log('Status code:', res.status);
    console.log('Number of products returned:', res.data.length);
    if (res.data.length > 0) {
      console.log('First product details:');
      const p = res.data[0];
      console.log('Name:', p.name);
      console.log('Slug:', p.slug);
      console.log('Image:', p.image);
      console.log('Images length:', p.images?.length);
      console.log('First Image Url:', p.images?.[0]?.url);
      console.log('Variants count:', p.variants?.length);
      console.log('Colors count:', p.colors?.length);
      console.log('Color Name:', p.colors?.[0]?.color);
    }
  } catch (err) {
    console.error('API Fetch failed:', err.message);
  }

  console.log('\n--- FETCHING SINGLE PRODUCT DETAIL ---');
  try {
    const res = await axios.get('http://localhost:3000/api/products?slug=grape-shake-pin-tuck-linen-kutra');
    console.log('Status code:', res.status);
    if (res.data.length > 0) {
      const p = res.data[0];
      console.log('Name:', p.name);
      console.log('Slug:', p.slug);
      console.log('Fabric:', p.fabric);
      console.log('Care:', p.care);
      console.log('Images:', JSON.stringify(p.images));
    } else {
      console.log('Product not found by slug');
    }
  } catch (err) {
    console.error('Single API Fetch failed:', err.message);
  }
}

main();
