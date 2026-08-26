/**
 * Electron 同梱 Node と、プロジェクトの Node 指定（engines / .nvmrc / CI）の整合を検証する。
 * Dependabot が electron だけ上げたときに、ホスト Node 指定の更新漏れを落とす。
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'))
}

function readTrim(rel) {
  const p = path.join(root, rel)
  if (!fs.existsSync(p)) return null
  return fs.readFileSync(p, 'utf8').trim()
}

/** engines の `^22.14.0 || ^24.0.0` などからメジャー番号を拾う */
function majorsFromRange(range) {
  return [
    ...new Set(
      String(range)
        .split('||')
        .map((part) => {
          const m = part.trim().match(/(?:>=|>|\^|~|=)?\s*v?(\d+)/)
          return m ? Number(m[1]) : null
        })
        .filter((n) => Number.isInteger(n))
    )
  ].sort((a, b) => a - b)
}

function parseCiNodeMajors(workflowText) {
  const majors = new Set()
  const inline = workflowText.match(/\bnode:\s*\[([^\]]+)\]/)
  if (inline) {
    for (const tok of inline[1].split(',')) {
      const m = tok.trim().match(/^['"]?(\d+)/)
      if (m) majors.add(Number(m[1]))
    }
  }
  const block = workflowText.match(/\bnode:\s*\n((?:\s*-\s*.+\n?)+)/)
  if (block) {
    for (const line of block[1].split('\n')) {
      const m = line.match(/-\s*['"]?(\d+)/)
      if (m) majors.add(Number(m[1]))
    }
  }
  return [...majors].sort((a, b) => a - b)
}

function electronBinaryPath() {
  const electronRoot = path.dirname(require.resolve('electron/package.json', { paths: [root] }))
  const rel = fs.readFileSync(path.join(electronRoot, 'path.txt'), 'utf8').replace(/\r?\n$/, '')
  return {
    electronRoot,
    bin: path.join(electronRoot, 'dist', rel),
    version: require(path.join(electronRoot, 'package.json')).version
  }
}

function readElectronVersions(bin) {
  const r = spawnSync(bin, ['-e', 'process.stdout.write(JSON.stringify(process.versions))'], {
    encoding: 'utf8',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
  })
  if (r.status !== 0) {
    throw new Error(
      `failed to read electron process.versions (exit ${r.status}): ${r.stderr || r.stdout}`
    )
  }
  return JSON.parse(r.stdout)
}

function fail(messages) {
  console.error('[check-node-alignment] FAILED')
  for (const msg of messages) console.error(`  - ${msg}`)
  console.error(
    '\nElectron を上げたあとは engines.node / .nvmrc / .node-version / CI matrix を合わせてください。'
  )
  process.exit(1)
}

function main() {
  const errors = []
  const pkg = readJson('package.json')
  const engineRange = pkg.engines?.node
  if (!engineRange) {
    fail(['package.json に engines.node がありません'])
  }

  const engineMajors = majorsFromRange(engineRange)
  if (engineMajors.length === 0) {
    fail([`engines.node からメジャーを解釈できません: ${engineRange}`])
  }

  const { bin, version: electronVersion } = electronBinaryPath()
  if (!fs.existsSync(bin)) {
    fail([
      `Electron バイナリがありません: ${bin}`,
      '先に `pnpm ensure:electron` を実行してください'
    ])
  }

  const versions = readElectronVersions(bin)
  const electronNode = versions.node
  const electronNodeMajor = Number(electronNode.split('.')[0])
  const electronOwnEngines = require(
    path.join(
      path.dirname(require.resolve('electron/package.json', { paths: [root] })),
      'package.json'
    )
  ).engines?.node

  const nvmrc = readTrim('.nvmrc')
  const nodeVersionFile = readTrim('.node-version')
  const ciPath = path.join(root, '.github/workflows/ci.yml')
  const ciText = fs.existsSync(ciPath) ? fs.readFileSync(ciPath, 'utf8') : ''
  const ciMajors = parseCiNodeMajors(ciText)

  console.log('[check-node-alignment]')
  console.log(`  electron:           ${electronVersion}`)
  console.log(`  electron node:      ${electronNode} (major ${electronNodeMajor})`)
  console.log(`  electron engines:   ${electronOwnEngines ?? '(none)'}`)
  console.log(`  package engines:    ${engineRange} → majors [${engineMajors.join(', ')}]`)
  console.log(`  .nvmrc:             ${nvmrc ?? '(missing)'}`)
  console.log(`  .node-version:      ${nodeVersionFile ?? '(missing)'}`)
  console.log(`  CI node majors:     [${ciMajors.join(', ') || 'none'}]`)

  if (!engineMajors.includes(electronNodeMajor)) {
    errors.push(
      `Electron 同梱 Node ${electronNode} のメジャー ${electronNodeMajor} が engines.node (${engineRange}) に含まれていません`
    )
  }

  for (const [label, value] of [
    ['.nvmrc', nvmrc],
    ['.node-version', nodeVersionFile]
  ]) {
    if (!value) {
      errors.push(`${label} がありません`)
      continue
    }
    const major = Number(value.match(/^v?(\d+)/)?.[1])
    if (!Number.isInteger(major)) {
      errors.push(`${label} の値を解釈できません: ${value}`)
    } else if (!engineMajors.includes(major)) {
      errors.push(
        `${label} (${value}) のメジャー ${major} が engines.node (${engineRange}) に含まれていません`
      )
    }
  }

  if (ciMajors.length === 0) {
    errors.push('.github/workflows/ci.yml から node matrix を読めませんでした')
  } else {
    for (const major of ciMajors) {
      if (!engineMajors.includes(major)) {
        errors.push(`CI の Node ${major} が engines.node (${engineRange}) に含まれていません`)
      }
    }
    if (!ciMajors.includes(electronNodeMajor)) {
      errors.push(
        `CI の node matrix [${ciMajors.join(', ')}] に Electron 同梱 Node メジャー ${electronNodeMajor} がありません`
      )
    }
  }

  if (errors.length) fail(errors)
  console.log('  OK')
}

main()
