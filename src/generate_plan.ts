import { exec } from '@actions/exec'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'

export async function generate_plan(
  folder: string
): Promise<{ json: any; text: string }> {
  if (!existsSync(folder)) {
    throw new Error(`The folder ${folder} does not exist.`)
  }

  await exec('terraform', ['init'], { cwd: folder })
  await exec('terraform', ['plan', '-out=tfplan'], { cwd: folder })
  let json_plan = ''
  await exec('terraform', ['show', '-json', 'tfplan'], {
    cwd: folder,
    listeners: {
      stdout: (data: Buffer) => {
        json_plan += data.toString()
      }
    }
  })
  let text_plan = ''
  await exec('terraform', ['show', '-no-color', 'tfplan'], {
    cwd: folder,
    listeners: {
      stdout: (data: Buffer) => {
        text_plan += data.toString()
      }
    }
  })
  return {
    json: JSON.parse(json_plan),
    text: text_plan
  }
}
