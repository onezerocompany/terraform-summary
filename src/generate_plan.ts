import { exec } from '@actions/exec'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'

export async function generate_plan(folder: string): Promise<any> {
  if (!existsSync(folder)) {
    throw new Error(`The folder ${folder} does not exist.`)
  }

  await exec('terraform', ['init'], { cwd: folder })
  await exec('terraform', ['plan', '-out=tfplan'], { cwd: folder })
  await exec('terraform', ['show', '-json', 'tfplan', '>', 'tfplan.json'], {
    cwd: folder
  })

  if (!existsSync(`${folder}/tfplan.json`))
    throw new Error('Failed to generate plan')
  const plan = await readFile(`${folder}/tfplan.json`, 'utf8')
  return JSON.parse(plan)
}
