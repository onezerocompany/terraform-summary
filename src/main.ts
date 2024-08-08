import * as core from '@actions/core'
import { readFileSync } from 'fs'
import { markdown_plan } from './markdown_plan'
import { resolve } from 'path'
import { generate_plan } from './generate_plan'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const folders = core.getInput('folders')

    let markdown = '## Terraform summary:\n\n'
    for (const folder of folders) {
      markdown += `### ${folder}\n\`\`\`\n`
      const absolute = resolve(process.cwd(), folder)
      console.log(`Processing: ${absolute}`)
      const plan = await generate_plan(absolute)
      markdown += `${markdown_plan(plan)}\n\n`
      markdown += '```\n\n'
    }
    core.setOutput('summary', markdown)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
