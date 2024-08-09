import * as core from '@actions/core'
import * as github from '@actions/github'
import { markdown_plan } from './markdown_plan'
import { resolve } from 'path'
import { generate_plan } from './generate_plan'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const folders = core
      .getInput('folders')
      .trim()
      .split('\n')
      .flatMap(folder => folder.split(','))

    let markdown = '## Terraform summary:\n\n'
    for (const folder of folders) {
      markdown += `### ${folder}\n\`\`\`\n`
      const absolute = resolve(process.cwd(), folder)
      console.log(`Processing: ${absolute}`)
      const plan = await generate_plan(absolute)
      markdown += markdown_plan(plan)
      markdown += '\n```\n\n'
    }

    // update the description of the pull request
    // check for a <!-- terraform-plan:start --> comment
    const body = github.context.payload.pull_request?.body ?? ''

    const start = '<!-- terraform-plan:start -->'
    const end = '<!-- terraform-plan:end -->'

    const startIndex = body.indexOf(start)
    const endIndex = body.indexOf(end)

    let newBody = body
    if (startIndex !== -1 && endIndex !== -1) {
      newBody =
        body.substring(0, startIndex + start.length) +
        '\n\n' +
        markdown +
        body.substring(endIndex)
    } else {
      newBody = `${body}\n\n${start}\n\n${markdown}\n\n${end}`
    }

    const client = github.getOctokit(core.getInput('github-token'))
    await client.rest.issues.update({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: github.context.payload.pull_request?.number ?? 0,
      body: newBody
    })

    core.setOutput('summary', markdown)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
