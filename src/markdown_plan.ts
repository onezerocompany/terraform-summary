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

export function markdown_plan(plan: Plan): string {
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

export function has_changes(plan: Plan): boolean {
  return plan.resource_changes.some((change: ResourceChange) =>
    change.change.actions.some((action: string) => actions[action])
  )
}
