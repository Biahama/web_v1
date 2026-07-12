// ============================================================
// THEME & LAYOUT PAGE (server side)
// ============================================================
// This tiny server component exists for one reason: the list of
// editable knobs lives in lib/site-settings.js, and that file
// also talks to the database — which browsers must never do.
// So we read the plain lists HERE (on the server) and hand them
// to the interactive editor as simple props.
// ============================================================

import { EDITABLE_TOKENS, DEFAULT_FONTS, DEFAULT_LAYOUT } from '@/lib/site-settings'
import ThemeEditor from './ThemeEditor'

export const dynamic = 'force-dynamic'

export default function ThemePage() {
  return (
    <ThemeEditor
      tokens={EDITABLE_TOKENS}
      defaultFonts={DEFAULT_FONTS}
      defaultLayout={DEFAULT_LAYOUT}
    />
  )
}
