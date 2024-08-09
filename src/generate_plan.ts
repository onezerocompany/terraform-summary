import { exec } from '@actions/exec'
import { existsSync } from 'fs'

export async function generate_plan(
  folder: string
): Promise<{ json: any; text: string }> {
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
