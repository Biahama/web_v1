import { rm, readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
// Vercel can restore a previous .next directory. Rebuild generated output so
// a successful release cannot silently reuse an older stylesheet.
await rm(new URL('../.next/', import.meta.url), { recursive: true, force: true })
const build = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], { cwd: root, stdio: 'inherit' })
if (build.status !== 0) process.exit(build.status || 1)

// Inspect the CSS actually linked by the generated homepage, rather than an
// unrelated chunk that happens to contain the expected classes.
const html = await readFile(new URL('../.next/server/app/index.html', import.meta.url), 'utf8')
const hrefs = [...html.matchAll(/href="([^"]+\.css(?:\?[^"]*)?)"/g)]
  .map(match => match[1].split('?')[0])
  .filter(href => href.startsWith('/_next/static/'))
if (!hrefs.length) throw new Error('The generated homepage has no local stylesheets')
const css = (await Promise.all(hrefs.map(href => readFile(new URL(`../.next/${href.slice('/_next/'.length)}`, import.meta.url), 'utf8')))).join('\n')
const required = ['.campaign-hero', '.campaign-hero-image', '.home-collection-grid', '.site-nav', '.admin-shell']
const missing = required.filter(selector => !css.includes(selector))
if (missing.length) throw new Error(`Build is missing required storefront styles: ${missing.join(', ')}`)
console.log('Verified campaign, collection, navigation and admin styles in the production build.')
