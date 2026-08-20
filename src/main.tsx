const showStartupError = (error: unknown) => {
  const root = document.getElementById('root') || document.body
  const message = error instanceof Error
    ? `${error.name}: ${error.message}\n\n${error.stack || ''}`
    : String(error)

  root.innerHTML = ''
  const pre = document.createElement('pre')
  pre.style.whiteSpace = 'pre-wrap'
  pre.style.wordBreak = 'break-word'
  pre.style.padding = '20px'
  pre.style.margin = '0'
  pre.style.fontFamily = 'monospace'
  pre.style.fontSize = '13px'
  pre.style.lineHeight = '1.4'
  pre.textContent = `Startup error:\n${message}`
  root.appendChild(pre)
}

window.addEventListener('error', (event) => {
  showStartupError(event.error || `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`)
})

window.addEventListener('unhandledrejection', (event) => {
  showStartupError(event.reason)
})

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  ;(window as Window & { __pwaInstallPrompt?: Event }).__pwaInstallPrompt = e
})

import('./app-bootstrap')
  .then(({ bootstrapApp }) => bootstrapApp())
  .catch(showStartupError)
