import { Command, Flags } from '@oclif/core'
import 'zx/globals'

import { checkAWScredentials, checkForSysconfDirectory } from '../utils/functions.js'


export default class Tfi extends Command {
  static description = 'Performs terraform init'

  static flags = {
    directory: Flags.string({ char: 'd', description: 'directory to run the command in' }),
  }

  async run(): Promise<void> {
    $.verbose = false

    const { flags } = await this.parse(Tfi)
    const { directory } = flags

    try {
      await checkForSysconfDirectory(directory)

      await checkAWScredentials()
      
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      this.error(error)
    }

    try {
      await $`git pull`
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (error.stderr.includes('There is no tracking information for the current branch')) {
        this.warn('There is no tracking information for the current branch')
      }
    }

    $.verbose = true

    try {
      const args: string[] = []
      if (fs.existsSync('init.txt')) {
        args.push('--backend-config', 'init.txt')
      }

      await $`terraform init -reconfigure ${args} $*`;
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      throw chalk.red(error.stderr)
    }
  }
}
