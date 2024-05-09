import { Command, Flags } from '@oclif/core'

import { planName } from '../utils/constants.js'
import { checkForSysconfDirectory } from '../utils/functions.js'

export default class Tfa extends Command {
  static description = 'Performs terraform apply'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static flags = {
    directory: Flags.string({ char: 'd', description: 'directory to run the command in' }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Tfa)
    const { directory } = flags

    try {
      await checkForSysconfDirectory(directory)
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      this.error(error)
    }

    $.verbose = true

    try {
      await $`terraform apply ${planName}`
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      throw chalk.red(error.stderr)
    }
  }
}
