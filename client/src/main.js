// ── App entry point ──
// Thin orchestrator — all logic lives in lib/, effects/, organizer/, pages/.

import { renderNav }    from './components/nav.js'
import { renderFooter } from './components/footer.js'

import { initTheme, toggleTheme } from './lib/theme.js'
import { showToast }               from './lib/toast.js'
import { navigate, routes }        from './lib/router.js'
import './lib/meta.js'             // side-effect: boots __APP_META_PROMISE + dev banner

import { initStarfield }                               from './effects/starfield.js'
import { initCursor }                                  from './effects/cursor.js'
import { initKonami, initLogoSecret, registerAnniRoute } from './effects/easter-eggs.js'

import { prefetchGitHub } from './pages/home.js'

// Register the hidden /anni route
registerAnniRoute(routes)

// ── Boot sequence ──
initTheme()
initStarfield()
initCursor()
initKonami()

renderNav(document.getElementById('nav-root'))
renderFooter(document.getElementById('footer-root'))

initLogoSecret()
prefetchGitHub()   // warm GitHub cache before home page renders
navigate()

// ── Re-exports for backwards compatibility ──
// login.js dynamically imports main.js to get showToast — keep these here.
export { showToast, toggleTheme }
