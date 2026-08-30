import { deploymentIdentity } from '../packages/database/src/deployment.ts'

const argument = (name: string) => {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

const environment = argument('--environment')
const requestedStage = argument('--stage') ?? process.env.SST_STAGE ?? 'jeremy'
const stage =
  environment === 'dev'
    ? 'dev'
    : environment === 'production'
      ? 'production'
      : requestedStage
const format = argument('--format') ?? 'json'
const identity = deploymentIdentity({ stage })

if (format === 'github') {
  for (const [key, value] of Object.entries(identity)) {
    if (value !== undefined) process.stdout.write(`${key}=${value}\n`)
  }
} else if (format === 'url') {
  process.stdout.write(`https://${identity.apiDomain}\n`)
} else {
  process.stdout.write(`${JSON.stringify(identity, undefined, 2)}\n`)
}
