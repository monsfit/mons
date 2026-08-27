import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputsFile = resolve(repositoryDirectory, '.sst/outputs.json')
const stageFile = resolve(repositoryDirectory, '.sst/stage')
const developmentConfigurationFile = resolve(
  repositoryDirectory,
  'clients/ios/Configuration/Development.xcconfig',
)
const localConfigurationFile = resolve(
  repositoryDirectory,
  'clients/ios/Configuration/Local.xcconfig',
)

let outputs
try {
  outputs = JSON.parse(readFileSync(outputsFile, 'utf8'))
} catch (error) {
  console.error('Could not read .sst/outputs.json. Start `pnpm sst dev` first.')
  throw error
}

if (typeof outputs.apiUrl !== 'string') {
  throw new Error('The active SST stage did not output an apiUrl.')
}

const apiURL = new URL(outputs.apiUrl)
if (
  !['http:', 'https:'].includes(apiURL.protocol) ||
  !apiURL.hostname ||
  apiURL.username ||
  apiURL.password ||
  apiURL.search ||
  apiURL.hash
) {
  throw new Error('The active SST stage output an unsupported API URL.')
}

const developmentConfiguration = readFileSync(developmentConfigurationFile, 'utf8')
const setting = developmentConfiguration.match(
  /^([A-Z][A-Z0-9_]*_API_BASE_URL)\s*=/m,
)?.[1]
if (!setting) {
  throw new Error('Development.xcconfig does not define an API base URL setting.')
}

const xcconfigURL = apiURL.href.replace('://', ':/$()/')
const temporaryFile = `${localConfigurationFile}.${process.pid}`
writeFileSync(temporaryFile, `${setting} = ${xcconfigURL}\n`)
renameSync(temporaryFile, localConfigurationFile)

const stage = readFileSync(stageFile, 'utf8').trim()
console.log(`Mons iOS API (${stage}): ${apiURL.href}`)
