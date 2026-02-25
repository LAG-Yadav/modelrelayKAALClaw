#!/usr/bin/env node
/**
 * @file modelrelay.js
 * @description Web dashboard and OpenAI-compatible router for coding LLM models.
 */

import { parseArgs } from '../lib/utils.js'
import { loadConfig } from '../lib/config.js'
import { runOnboard } from '../lib/onboard.js'
import { getAutostartStatus, installAutostart, startAutostart, uninstallAutostart } from '../lib/autostart.js'

function printHelp() {
  console.log('modelrelay')
  console.log('')
  console.log('Usage:')
  console.log('  modelrelay [--port <port>] [--log] [--ban <model1,model2>]')
  console.log('  modelrelay onboard [--port <port>]')
  console.log('  modelrelay install --autostart')
  console.log('  modelrelay start --autostart')
  console.log('  modelrelay uninstall --autostart')
  console.log('  modelrelay status --autostart')
  console.log('  modelrelay autostart [--install|--start|--uninstall|--status]')
  console.log('')
  console.log('Flags:')
  console.log('  --port <number>    Router HTTP port (default: 7352)')
  console.log('  --log              Enable request payload logging in terminal (off by default)')
  console.log('  --no-log           Disable request payload logging in terminal (legacy/override)')
  console.log('  --ban <ids>        Comma-separated model IDs to keep banned')
  console.log('  --onboard          Same as the onboard subcommand')
  console.log('  --autostart        Manage start-on-login behavior for the router')
  console.log('  --install          For autostart subcommand: enable at login')
  console.log('  --start            For autostart subcommand: trigger service start now')
  console.log('  --uninstall        For autostart subcommand: disable at login')
  console.log('  --status           For autostart subcommand: show status')
  console.log('  --help, -h         Show help')
}

function runAutostartAction(action) {
  if (action === 'install') {
    const installResult = installAutostart()
    if (!installResult.ok) return installResult

    const startResult = startAutostart()
    if (!startResult.ok) {
      return {
        ok: true,
        supported: installResult.supported,
        path: installResult.path,
        message: `${installResult.message}\nAutostart install succeeded, but start-now failed: ${startResult.message}`,
      }
    }

    return {
      ok: true,
      supported: installResult.supported,
      path: installResult.path,
      message: `${installResult.message}\n${startResult.message}`,
    }
  }
  if (action === 'start') return startAutostart()
  if (action === 'uninstall') return uninstallAutostart()
  return getAutostartStatus()
}

async function main() {
  const cliArgs = parseArgs(process.argv)

  if (cliArgs.help) {
    printHelp()
    return
  }

  if (cliArgs.autostartAction) {
    const result = runAutostartAction(cliArgs.autostartAction)

    if (result.ok) {
      console.log(result.message)
      if (result.path) console.log(`Path: ${result.path}`)
      return
    }

    console.error(result.message)
    process.exit(1)
  }

  if (cliArgs.onboard) {
    const shouldStartRouter = await runOnboard(cliArgs.portValue || 7352)
    if (!shouldStartRouter) return
  }

  const config = loadConfig()

  const { runServer } = await import('../lib/server.js')

  await runServer(config, cliArgs.portValue || 7352, cliArgs.enableLog, cliArgs.bannedModels)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
