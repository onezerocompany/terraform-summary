import * as core from '@actions/core'
import * as github from '@actions/github'
import { DefaultArtifactClient } from '@actions/artifact'

import { plan } from './plan'
import { writeFileSync } from 'fs'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const folder = core.getInput('folder').trim()
    if (!folder) {
      throw new Error('The folder input is required.')
    }

    const output = await plan(folder)
    let markdown = `### ${core.getInput('title')}\n\n`
    if (output.has_changes) {
      markdown += '```\n' + output.markdown + '\n```\n\n'
    } else {
      markdown += '```\nNo changes detected.\n```\n\n'
    }

    const id = core.getInput('id')
    const log_file = `${id}_log.txt`
    writeFileSync(log_file, output.log)

    const artifact = new DefaultArtifactClient()
    const upload = await artifact.uploadArtifact(
      log_file,
      [log_file],
      process.cwd(),
      {}
    )

    if (upload.id) {
      const artifactUrl = `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}/actions/runs/${github.context.runId}/artifacts/${upload.id}`
      markdown += `[Read the full log](${artifactUrl})`
    }

    core.setOutput('markdown', markdown)
    core.setOutput('json', output.plan)
    core.setOutput('has_changes', output.has_changes)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
