import { Command, Flags } from '@oclif/core'

import { planName } from '../utils/constants.js'
import { askYesNoQuestion, checkForSysconfDirectory, customSpinner, getDirectory, logCommand } from '../utils/functions.js'
import Ghpr from './ghpr.js'
import Gpacp from './gpacp.js'
import Tfa from './tfa.js'

export default class Tfp extends Command {
  static description = 'Performs terraform plan'

  static examples = [
    '# run full terraform plan\n<%= config.bin %> <%= command.id %>',

    '# run terraform plan with a list of targeted modules\n<%= config.bin %> <%= command.id %> -m "cards, talend_cards"',

    '# run terraform plan with a list of targeted resources\n<%= config.bin %> <%= command.id %> -r "aws_iam_role.test, aws_lambda_function.another_test"',

    '# run terraform plan with a list of targeted modules and resources and create a pull request\n<%= config.bin %> <%= command.id %> -m "cards, talend_cards" -r "aws_iam_role.test, aws_lambda_function.another_test" -p',
  ]

  static flags = {
    applyTerraform: Flags.boolean({ char: 'a', default: false, description: 'apply terraform?' }),
    createPR: Flags.boolean({ char: 'p', default: false, description: 'create pull request after plan?' }),
    directory: Flags.string({ char: 'd', description: 'directory to run the command in' }),
    modules: Flags.string({ char: 'm', description: 'comma separated list of modules to plan', multiple: true }),
    outputPlan: Flags.boolean({ char: 'o', default: false, description: 'store output of plan?' }),
    resources: Flags.string({ char: 'r', description: 'comma separated list of resources to plan', multiple: true }),
  }

  async run(): Promise<void> {
    $.verbose = false

    const { flags } = await this.parse(Tfp)
    const { applyTerraform, createPR, outputPlan } = flags
    let { directory, modules, resources } = flags

    if (createPR && applyTerraform) {
      this.error(chalk.red('createPR (-p) and applyTerraform (-a) cannot both be set to true'))
    }

    modules = modules || []
    resources = resources || []

    const planCommand: string = configurePlanFlags(modules, resources, createPR, outputPlan)

    try {
      const data: PlanAndMaybeCommitPRData = { applyTerraform, createPR, directory, outputPlan, planCommand }
      await planAndMaybeCommitPR(data)
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      this.error(error)
    }
  }
}

async function planAndMaybeCommitPR(data: PlanAndMaybeCommitPRData): Promise<void> {
  const { applyTerraform, createPR, outputPlan, planCommand } = data
  
  let { directory } = data

  if (!directory) directory = ""

  $.verbose = false
  logCommand(planCommand);

  const directoryQuery = "Please enter the full path to the output plan directory: "

  const planOutputDir: string = await getDirectory(directoryQuery, 'planOutput')

  try {
    await checkForSysconfDirectory(directory)
    await customSpinner('running terraform plan', $`eval ${planCommand}`)

    const { stdout: plan } = await $`terraform show ${planName} -no-color`

    console.log(plan);

    if (outputPlan) {
      await writePlanOutputToFile(directory, planOutputDir, plan)
    }

    if (createPR) {      
      await configureAndCreatePullRequest(plan)
    }

    if (applyTerraform) {
      let applyQuestion: string = "Apply terraform "

      if (directory) {
        applyQuestion += `in ${directory.trim()}`
      }

      applyQuestion += "? [y/N]:"

      const shouldApply = await askYesNoQuestion(applyQuestion, "N")

      if (shouldApply) {
        await Tfa.run([`-d ${directory}`])
      }
    }
  } catch (error) {
    throw chalk.red(error)
  }
}

export async function writePlanOutputToFile(env: string, outputDir: string, plan: string): Promise<void> {
  if (env) {
    env = env.split('/').pop() || "none"

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    if (!fs.existsSync(`${outputDir}/${env}`)) {
      fs.mkdirSync(`${outputDir}/${env}`);
    }

    const file: string = `${outputDir}/${env}/tergit-crplan.txt`

    fs.writeFileSync(file, plan)
  }
}

async function configureAndCreatePullRequest(plan: string): Promise<void> {
  const PR_BODY: string = `\`\`\`hcl\n${plan}\n\`\`\`\n`

  const createCommit = await askYesNoQuestion("Create commit? [Y/n]: ")

  if (createCommit) {
    const commitMessage: string = await question("Enter commit message: ")

    await Gpacp.run([commitMessage])
    await Ghpr.run([`-b ${PR_BODY}`])
  }
}

function configurePlanFlags(modules: string[], resources: string[], createPR: boolean, outputPlan: boolean): string {
  let planCommand: string = "terraform plan -out crplan"

  if (modules) {
    for (let module of modules) {
      module = module.trim()

      if (module) {
        planCommand += ` -target module.${module}`
      }
    }
  }

  if (resources) {
    for (let resource of resources) {
      resource = resource.trim()

      if (resource) {
        planCommand += ` -target ${resource}`
      }
    }
  }

  if (createPR || outputPlan) {
    planCommand += ` -no-color`
  }

  return planCommand
}

interface PlanAndMaybeCommitPRData {
  applyTerraform: boolean,
  createPR: boolean,
  directory: string | undefined
  outputPlan: boolean,
  planCommand: string,
}