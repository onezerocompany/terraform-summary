import { exec } from '@actions/exec'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'

export async function generate_plan(folder: string): Promise<any> {
  if (!existsSync(folder)) {
    throw new Error(`The folder ${folder} does not exist.`)
  }

  await exec('terraform', ['init'], { cwd: folder })
  await exec('terraform', ['plan', '-out=tfplan'], { cwd: folder })
  let plan = ''
  await exec('terraform', ['show', '-json', 'tfplan'], {
    cwd: folder,
    listeners: {
      stdout: (data: Buffer) => {
        plan += data.toString()
      }
    }
  })
  return JSON.parse(plan)
}
