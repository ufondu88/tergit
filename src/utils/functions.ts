import { ux } from '@oclif/core'
import { ChildProcess, spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import 'zx/globals'

import { configFile, planName, planOutputQuery, sysconfOutputQuery, tf2Folders } from './constants.js'
import { PlanData, TfipFlags } from './interfaces.js'

const config: Config = await getConfig()

/**
 * check is AWS credentials are expired. If expired, start login flow
 * @returns Promise
 */
export async function checkAWScredentials(): Promise<void> {
  $.verbose = false

  try {
    await $`aws sts get-caller-identity &> /dev/null`
  } catch (error) {
    console.warn(error);
    $.verbose = true
    console.warn('AWS credentials expired')

    await customSpinner('getting new AWS credentials', $`aws sso login`)
  }
}

/**
 * Check if the current directory is a git repository
 * @returns Promise
 */
export async function isInsideGitRepo(): Promise<boolean> {
  $.verbose = false

  try {
    await $`git rev-parse --is-inside-work-tree`
    return true
  } catch (error) {
    console.warn(error);

    return false
  }
}

/**
 * Get the current branch name
 * @returns Promise
 */
export async function currentBranch(): Promise<string> {
  $.verbose = false

  const { stdout } = await $`git symbolic-ref --short HEAD`

  return stdout.split("\n")[0]
}

/**
 * Get the root of the git repository
 * @returns Promise
 */
export async function repoRoot(): Promise<string> {
  $.verbose = false

  const { stdout } = await $`git rev-parse --show-toplevel`

  return stdout.split("\n")[0]
}

/**
 * Get the default branch of the git repository
 * @returns Promise
 */
export async function defaultBranch(): Promise<string> {
  $.verbose = false

  const { stdout } = await $`git remote show origin | sed -n '/HEAD branch/s/.*: //p'`

  return stdout.split("\n")[0]
}

/**
 * Get the name of the git repository
 * @returns Promise
 */
export async function repoName(): Promise<string> {
  $.verbose = false

  const { stdout } = await $`basename \`git rev-parse --show-toplevel\``

  return stdout.split("\n")[0]
}

/**
 * Returns the latest commit message from the current branch if any exist
 * @returns Promise
 */
export async function latestCommitMessage(): Promise<string> {
  $.verbose = false

  const { stdout } = await $`git log -1 --pretty=%B`

  return stdout.split("\n")[0]
}

/**
 * Returns true if an upstream branch exists for the provided branch, else returns false
 * @param branch - local branch to check for upstream branch of
 * @returns Promise
 */
async function upstreamBranchExists(branch: string): Promise<boolean> {
  $.verbose = false

  const { stdout: upstream } = await $`git ls-remote --heads origin refs/heads/${branch}`

  return upstream !== undefined && upstream !== null
}

/**
 * Check if an upstream branch exists for the provided branch and
 * creates a new upstream branch if none exists
 * @param branch - local branch to check for upstream branch of
 * @param [gitPull=false] - whether to perform git pull if upstream branch exists
 * @returns Promise<void>
 */
export async function createUpstreamBranchIfNoneExists(branch: string, gitPull: boolean = false): Promise<void> {
  $.verbose = false

  try {
    const upstreamExists = await upstreamBranchExists(branch)

    if (upstreamExists) {
      if (gitPull) {
        console.log('git pull')
        await $`git pull`
      }

      return
    }

    console.log(`Upstream branch for ${branch} does not exist. Creating upstream branch`);

    await $`git branch --set-upstream-to=origin/${branch} ${branch}`
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (error.stderr.includes(`the requested upstream branch 'origin/${branch}' does not exist`)) {
      await $`git push -u origin ${branch}`

      if (gitPull) {
        console.log('git pull')
        await $`git pull`
      }
    } else {
      console.warn(error.stderr)
    }
  }
}

export function configureTfipFlags(flags: TfipFlags): string[] {
  const tfipFlags: string[] = []

  if (flags.directory) {
    tfipFlags.push(`-d ${flags.directory}`)
  }

  if (flags.outputPlan) {
    tfipFlags.push(`-o`)
  }

  if (flags.init) {
    tfipFlags.push(`-i`)
  }

  if (flags.modules) {
    for (const module of flags.modules) {
      tfipFlags.push(`-m ${module}`)
    }
  }

  if (flags.resources) {
    for (const resource of flags.resources) {
      tfipFlags.push(`-r ${resource}`)
    }
  }

  if (flags.createPR) {
    tfipFlags.push('-p')
  }

  if (flags.applyTerraform) {
    tfipFlags.push('-a')
  }

  return tfipFlags
}

/**
 * Sanitizes the string that is passed in to remove unneccessary characters
 * @param item - string to be sanitized
 * @returns string
 */
export function sanitized(item: string): string {
  return item.trim()
    .replace('$', '')
    .replace("'", '')
    .replace('\n', '')
    .replace('\'', '')
}

/**
 * configure the plan command that will be used to 
 * plan terraform based on the data that is passed in
 * @param data - data to be used to configure the terraform plan
 * @returns string
 */
export async function configurePlanCommand(data: PlanData): Promise<string> {
  const { envs, folder, init, modules, resources } = data

  const sysconfDir: string = await getDirectory(sysconfOutputQuery, 'sysconf')
  const planOutputDir: string = await getDirectory(planOutputQuery, 'planOutput')

  const sysconfFolderPath: string = `${sysconfDir}/${folder}`

  let planCommand: string = ""

  for (const env of envs) {
    const directory = `${sysconfFolderPath}/${env}`

    planCommand += `cd ${directory} && `

    if (init) {
      planCommand += `echo "Terraform init in ${env}" && `

      planCommand += folder === "tf2" ? `terraform init --backend-config=init.txt && ` : `terraform init && `;
    }

    planCommand += `echo "Terraform plan in ${env}" && terraform plan -out ${planName} -no-color `

    if (modules) {
      const moduleList = convertToArray(modules)

      for (const module of moduleList) {
        planCommand += `-target module.${module} `
      }
    }

    if (resources) {
      const resourceList = convertToArray(resources)

      for (const resource of resourceList) {
        planCommand += `-target ${resource} `
      }
    }

    planCommand += "&& "

    if (!fs.existsSync(planOutputDir)) {
      planCommand += `mkdir ${planOutputDir} && `
    }

    if (!fs.existsSync(`${planOutputDir}/${env}`)) {
      planCommand += `mkdir ${planOutputDir}/${env} && `
    }

    let filename: string = ''

    if (!modules && !resources) {
      filename = "plan"
    } else {
      if (modules) {
        filename += modules.replace(' ', '').replace(',', '_')
      }

      if (resources) {
        filename += "_resources"
      }
    }

    const plan: string = `${planOutputDir}/${env}/${filename}-${planName}`

    planCommand += `plan="${plan}" && `

    if (fs.existsSync(plan)) {
      planCommand += `rm ${plan} && `
    }

    planCommand += `terraform show -no-color ${planName} > $plan & `
  }

  planCommand += " wait"

  return planCommand
}

export async function prAlreadyExists() {
  try {
    const { stdout } = await $`gh pr view --json state`
  
    const status: {state: string} = JSON.parse(stdout)
    
    return status.state !== 'MERGED'
  } catch {
    return false
  }
}

export async function currentPRInfo() {
  const args: string[] = ['--json', 'body,title,url']

  const { stdout } = await $`gh pr view ${args}`
  
  return JSON.parse(stdout) as { body: string, title: string, url: string }
}

// Function to execute Git command and parse the output
export async function getBaseBranch(): Promise<string> {
  $.verbose = false

  try {
    const { stdout } = await $`git log --pretty=format:'%D' HEAD^ | grep 'origin/' | head -n1 | sed 's@origin/@@' | sed 's@,.*@@'`

    return stdout
  } catch (error) {
    console.warn(error);

    return defaultBranch()
  }
}

export function configureApplyCommand(sysconfFolderPath: string, envs: string[]): string {
  let applyCommand: string = ""

  for (const env of envs) {
    const directory: string = `${sysconfFolderPath}/${env}`

    console.log(`Terraform apply in ${env}`);

    applyCommand += `cd ${directory} && terraform apply ${planName} & `
  }

  applyCommand += " wait"

  return applyCommand
}

export async function customSpinner(startMessage: string, action: ProcessPromise): Promise<ProcessOutput> {
  // start spinner
  ux.action.start(startMessage)

  const result = await action

  // stop spinner
  ux.action.stop()

  return result
}

export function getEnvFolder(env: string): "tf" | "tf2" {
  return tf2Folders.includes(env.trim()) ? "tf2" : "tf"
}

export function logCommand(command: string): void {
  const splitCommand: string[] = command.split(" ")
  const [firstWord, ...restOfCommand] = splitCommand

  console.log(`$ ${chalk.greenBright(firstWord)} ${restOfCommand.join(' ')}`)
}

export function convertToArray(value: string | undefined): string[] {
  if (!value) return []

  return value.replace(", ", ",").split(",")
}

export async function checkForSysconfDirectory(directory: string | undefined): Promise<string | undefined> {
  if (directory) {
    directory = directory.trim()

    const sysconfDir: string = await getDirectory(sysconfOutputQuery, 'sysconf')
    const folder: string = `${sysconfDir}/${getEnvFolder(directory)}/${directory}`

    try {
      cd(folder)

      return folder
    } catch (error) {
      console.warn(error)
      throw new Error(`directory ${directory} does not exist in ${sysconfDir}`)
    }
  }
}

interface Config {
  [key: string]: string;
}

async function getConfig(): Promise<Config> {
  $.verbose = false

  const config: Config = {};

  let { stdout: file } = await $`eval "echo ${configFile}"`

  file = file.trim()

  if (fs.existsSync(file)) {
    try {
      const data = fs.readFileSync(file, 'utf8');
      const lines = data.split('\n');

      for (const line of lines) {
        const [key, value] = line.split('=');
        if (key && value) {
          config[key.trim()] = value.trim();
        }
      }
    } catch (error) {
      console.error('Error reading config file:', error);
    }
  }

  return config;
}

export async function getDirectory(query: string, type: 'planOutput' | 'sysconf'): Promise<string> {
  $.verbose = false

  let directory: string

  directory = type === 'planOutput'
    ? config.plan_output_directory
    : config.sysconf_directory

  if (!directory) {
    directory = await getInput(query);
  }

  return directory.trim()
}

export async function getInput(query: string, allowEmpty: boolean = false) {
  let answer = await question(chalk.yellow(query))
  answer = answer.trim()

  if (!allowEmpty && (!answer ||  answer === "")) {
    return getInput(query); // Recursive call if directory is empty or not provided
  }

  return answer;
}

export async function getLargeInput() {
  // Create a temporary file path
  const tempFilePath: string = join(tmpdir(), 'tergit-pr-body.txt')

  // Open the default editor
  const editorProcess: ChildProcess = spawn(process.env.EDITOR || 'nano', [tempFilePath], {
    stdio: 'inherit',
  })

  // Wait for the editor to close
  await new Promise<void>((resolve, reject) => {
    editorProcess.on('close', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error('Editor closed with non-zero exit code'))
      }
    })
  })

  // Read the contents of the file
  const inputContent: string = fs.readFileSync(tempFilePath, 'utf8')

  // Remove the temporary file
  fs.unlinkSync(tempFilePath)

  return inputContent
}

export async function askYesNoQuestion(query: string, defaultAnswer: string = "Y") {
  defaultAnswer = defaultAnswer.trim().toLowerCase()
  let answer = await question(chalk.yellow(query));
  answer = answer.trim().toLowerCase()

  if (!answer || answer === "") answer = defaultAnswer  

  if (!['n', 'y'].includes(answer)) {
    return askYesNoQuestion(query, defaultAnswer); // Recursive call if input is not 'n' or 'y'
  }

  return answer === 'y'; // Return boolean value based on user input
}