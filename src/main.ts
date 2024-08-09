import * as core from '@actions/core'
import * as github from '@actions/github'
import { DefaultArtifactClient } from '@actions/artifact'

import { markdown_plan } from './markdown_plan'
import { resolve } from 'path'
import { generate_plan } from './generate_plan'
import { writeFileSync } from 'fs'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const pr = github.context.payload.pull_request?.number
    if (!pr) {
      core.setFailed('This action can only be run on pull requests.')
      return
    }

    const folders = core
      .getInput('folders')
      .trim()
      .split('\n')
      .flatMap(folder => folder.split(','))

    let markdown = '## Terraform changes:\n\n'
    let raw = ''
    for (const folder of folders) {
      markdown += `### ${folder}\n\`\`\`\n`
      const absolute = resolve(process.cwd(), folder)
      console.log(`Processing: ${absolute}`)
      const plan = await generate_plan(absolute)
      markdown += markdown_plan(plan.json)
      raw += `${folder}\n${plan.text}`
      markdown += '\n```\n\n'
    }

    writeFileSync('full_log.txt', raw)

    const artifact = new DefaultArtifactClient()
    const upload = await artifact.uploadArtifact(
      'full_log',
      ['full_log.txt'],
      process.cwd()
    )
    if (!upload.id) {
      throw new Error('Failed to upload artifact.')
    }
    const url = (await artifact.downloadArtifact(upload.id)).downloadPath

    markdown += `Full log: [full_log.txt](${url})`

    const id = '<!-- terraform-plan -->'
    const client = github.getOctokit(core.getInput('github-token'))

    // find a comment with the id using rest api
    const comments = await client.rest.issues.listComments({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: pr,
      per_page: 25
    })

    const comment = comments.data.find(comment => comment.body?.includes(id))

    if (comment) {
      // update the comment
      await client.rest.issues.updateComment({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        comment_id: comment.id,
        body: markdown
      })
    } else {
      // create a new comment
      await client.rest.issues.createComment({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: pr,
        body: `${markdown}\n${id}`
      })
    }

    core.setOutput('summary', markdown)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
