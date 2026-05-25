/**
 * 等待 Vite dev server 就绪后启动 Electron
 * 跨平台兼容：Linux / macOS / Windows
 */
const { spawn } = require('child_process')
const http = require('http')
const path = require('path')

const VITE_URL = 'http://localhost:5173'
const MAX_WAIT = 30000 // 30s
const CHECK_INTERVAL = 500

function waitForVite() {
  return new Promise((resolve, reject) => {
    const start = Date.now()

    function check() {
      const req = http.get(VITE_URL, (res) => {
        if (res.statusCode === 200) {
          res.resume()
          resolve(true)
        } else {
          retry()
        }
      })
      req.on('error', retry)
      req.setTimeout(2000, () => { req.destroy(); retry() })
    }

    function retry() {
      if (Date.now() - start > MAX_WAIT) {
        reject(new Error('Vite dev server did not start in time'))
        return
      }
      setTimeout(check, CHECK_INTERVAL)
    }

    check()
  })
}

async function main() {
  console.log('⏳ Waiting for Vite dev server...')
  try {
    await waitForVite()
    console.log('✅ Vite ready, launching Electron...')

    const electronBin = require('electron')
    const projectRoot = path.join(__dirname, '..')

    const child = spawn(electronBin, ['--no-sandbox', projectRoot], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' },
    })

    child.on('close', (code) => {
      process.exit(code || 0)
    })
  } catch (err) {
    console.error('❌', err.message)
    process.exit(1)
  }
}

main()
