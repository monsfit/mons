import { execFileSync } from 'node:child_process'

import {
  branchIdFromName,
  deploymentIdentity,
  isProtectedBranch,
  previewStageFromBranch,
} from '../packages/database/src/deployment.ts'

const argument = (name: string) => {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

const currentBranch = () => {
  const fromEnvironment = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME
  if (fromEnvironment) return fromEnvironment
  try {
    return (
      execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim() || undefined
    )
  } catch {
    return undefined
  }
}

const branch = argument('--branch') ?? currentBranch()
const environment = argument('--environment')
const requestedStage = argument('--stage') ?? process.env.SST_STAGE ?? 'jeremy'
if (environment === 'preview' && isProtectedBranch(branch)) {
  throw new Error(`A feature branch is required for a preview (received ${branch ?? 'none'})`)
}
const stage =
  environment === 'preview' && branch
    ? previewStageFromBranch(branch)
    : environment === 'dev'
      ? 'dev'
      : environment === 'production'
        ? 'production'
        : requestedStage
const format = argument('--format') ?? 'json'
const identity = deploymentIdentity({ stage, branch })

if (format === 'github') {
  if (!branch) throw new Error('A branch is required for GitHub output')
  const branchId = branchIdFromName(branch)
  const values = {
    ...identity,
    branch,
    branchId,
    previewStage: previewStageFromBranch(branch),
  }
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) process.stdout.write(`${key}=${value}\n`)
  }
} else if (format === 'url') {
  process.stdout.write(`https://${identity.apiDomain}\n`)
} else {
  process.stdout.write(`${JSON.stringify(identity, undefined, 2)}\n`)
}
