import { Command, Flags } from '@oclif/core'

import { configureTfipFlags } from '../utils/functions.js'
import { TfipFlags } from '../utils/interfaces.js'
import Tfp from './tfp.js'

export default class Tfip extends Command {
  static description = 'Performs terraform init and then terraform plan'

  static examples = [
    '# run terraform init and full terraform plan\n<%= config.bin %> <%= command.id %>',

    '# run terraform init and terraform plan with a list of targeted modules\n<%= config.bin %> <%= command.id %> -m "cards, talend_cards"',

    '# run terraform init and terraform plan with a list of targeted resources\n<%= config.bin %> <%= command.id %> -r "aws_iam_role.test, aws_lambda_function.another_test"',

    '# run terraform init and terraform plan with a list of targeted modules and resources and create a pull request\n<%= config.bin %> <%= command.id %> -m "cards, talend_cards" -r "aws_iam_role.test, aws_lambda_function.another_test" -p',
  ]

  static flags = {
    ...Tfp.flags,
    init: Flags.boolean({ char: 'i', default: false, description: 'Perform terraform init?' }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Tfip)
    const { directory } = flags    

    const tfpFlags: string[] = configureTfipFlags(flags as TfipFlags)
    const tfiFlags: string[] = []    

    if (directory) {
      tfiFlags.push(`-d ${directory}`)
    }

    try {
      await this.config.runCommand('tfi', tfiFlags)
      await this.config.runCommand('tfp', tfpFlags)
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      this.error(error)
    }
  }
}
