import { deploymentIdentity } from '../packages/database/src/deployment.ts'

const argument = (name: string) => {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

const environment = argument('--environment')
const requestedStage = argument('--stage') ?? process.env.MONS_STAGE
const stage =
  environment === 'dev' ? 'dev' : environment === 'production' ? 'production' : requestedStage
if (!stage) throw new Error('A deployment stage is required')
const format = argument('--format') ?? 'json'
const identity = deploymentIdentity({ stage })

if (format === 'url') {
  process.stdout.write(`https://${identity.apiDomain}\n`)
} else {
  process.stdout.write(`${JSON.stringify(identity, undefined, 2)}\n`)
}
