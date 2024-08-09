import { exec } from '@actions/exec'
import { existsSync } from 'fs'

interface Change {
  actions: string[]
}

interface ResourceChange {
  address: string
  change: Change
}

interface Plan {
  resource_changes: ResourceChange[]
}

let actions: {
  [key: string]: string
} = {
  create: '+',
  delete: '-',
  update: '~'
}

export async function plan(folder: string): Promise<{
  plan: Plan
  markdown: string
  log: string
  has_changes: boolean
}> {
  if (!existsSync(folder)) {
    throw new Error(`The folder ${folder} does not exist.`)
  }

  await exec('terraform', ['init', '-input=false', '-no-color'], {
    cwd: folder
  })
  await exec(
    'terraform',
    ['plan', '-out=tfplan', '-no-color', '-input=false'],
    {
      cwd: folder
    }
  )
  let json_plan = ''
  await exec('terraform', ['show', '-json', '-no-color', 'tfplan'], {
    cwd: folder,
    listeners: {
      stdout: (data: Buffer) => {
        json_plan += data.toString()
      }
    }
  })
  let log = ''
  await exec('terraform', ['show', '-no-color', 'tfplan'], {
    cwd: folder,
    listeners: {
      stdout: (data: Buffer) => {
        log += data.toString()
      }
    }
  })

  const plan = JSON.parse(json_plan) as Plan

  return {
    plan,
    markdown: markdown(plan),
    log,
    has_changes: detect_changes(plan)
  }
}

function markdown(plan: Plan): string {
  // convert output of terraform show -json tfplan to markdown
  let markdown = ''
  for (let change of plan.resource_changes.filter((change: ResourceChange) =>
    change.change.actions.some((action: string) => actions[action])
  )) {
    const prefix: string = change.change.actions
      .map((action: string) => actions[action])
      .join('')
    markdown += `${prefix} ${change.address}\n`
  }
  return markdown.trim()
}

function detect_changes(plan: Plan): boolean {
  return plan.resource_changes.some((change: ResourceChange) =>
    change.change.actions.some((action: string) => actions[action])
  )
}
