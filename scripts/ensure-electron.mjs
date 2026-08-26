/**
 * Electron バイナリが欠けている／壊れているときに修復する。
 * Node 26 等で公式 install.js（extract-zip）が不完全展開するケースの保険。
 * ダウンロードキャッシュはリポジトリ内 `.cache/electron` に閉じる。
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function resolveElectronRoot() {
  const pkgJson = require.resolve('electron/package.json', { paths: [root] })
  return path.dirname(pkgJson)
}

function platformExecutableRelPath() {
  switch (os.platform()) {
    case 'darwin':
      return 'Electron.app/Contents/MacOS/Electron'
    case 'win32':
      return 'electron.exe'
    default:
      return 'electron'
  }
}

function isHealthy(electronRoot, relExec) {
  const pathTxt = path.join(electronRoot, 'path.txt')
  const execPath = path.join(electronRoot, 'dist', relExec)
  if (!fs.existsSync(pathTxt) || !fs.existsSync(execPath)) return false
  const recorded = fs.readFileSync(pathTxt, 'utf8').replace(/\r?\n$/, '')
  if (recorded !== relExec) return false
  try {
    const st = fs.statSync(execPath)
    return st.isFile() && st.size > 0
  } catch {
    return false
  }
}

function writePathTxt(electronRoot, relExec) {
  // electron-vite は path.txt を trim しないため改行を付けない
  fs.writeFileSync(path.join(electronRoot, 'path.txt'), relExec)
}

function extractArchive(zipPath, dist) {
  if (process.platform === 'win32') {
    const ps = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${dist.replace(/'/g, "''")}' -Force`
      ],
      { encoding: 'utf8' }
    )
    if (ps.status !== 0) {
      throw new Error(
        `Expand-Archive failed (exit ${ps.status}): ${ps.stderr || ps.stdout || 'unknown'}`
      )
    }
    return
  }

  const unzip = spawnSync('unzip', ['-q', '-o', zipPath, '-d', dist], {
    encoding: 'utf8'
  })
  if (unzip.status !== 0) {
    throw new Error(
      `unzip failed (exit ${unzip.status}): ${unzip.stderr || unzip.stdout || 'unknown'}`
    )
  }
}

async function main() {
  const electronRoot = resolveElectronRoot()
  const { version } = require(path.join(electronRoot, 'package.json'))
  const relExec = platformExecutableRelPath()

  if (isHealthy(electronRoot, relExec)) {
    writePathTxt(electronRoot, relExec)
    return
  }

  const { downloadArtifact } = require(require.resolve('@electron/get', { paths: [electronRoot] }))

  const cacheRoot = path.join(root, '.cache', 'electron')
  fs.mkdirSync(cacheRoot, { recursive: true })

  const zipPath = await downloadArtifact({
    version,
    artifactName: 'electron',
    cacheRoot,
    platform: process.env.npm_config_platform || process.platform,
    arch: process.env.npm_config_arch || process.arch
  })

  const dist = path.join(electronRoot, 'dist')
  fs.rmSync(dist, { recursive: true, force: true })
  fs.mkdirSync(dist, { recursive: true })

  extractArchive(zipPath, dist)
  writePathTxt(electronRoot, relExec)

  if (!isHealthy(electronRoot, relExec)) {
    throw new Error(`Electron binary still missing after extract: ${path.join(dist, relExec)}`)
  }

  console.log(`[ensure-electron] installed electron@${version}`)
}

main().catch((err) => {
  console.error('[ensure-electron]', err.stack || err)
  process.exit(1)
})
