import { Args, Command } from '@oclif/core'

import { isInsideGitRepo, repoRoot } from '../utils/functions.js'

export default class Gac extends Command {
  static args = {
    commitMessage: Args.string({ description: 'Commit message to use with the commit', required: true }),
  }

  static description = 'Performs git add and git commit'

  static examples = [
    '<%= config.bin %> <%= command.id %> "this is a commit message"',
  ]

  public async run(): Promise<void> {
    const { args } = await this.parse(Gac)
    const { commitMessage } = args

    if (!(await isInsideGitRepo())) {
      this.error(chalk.red("Please run this command in a git repo"))
    }

    // Save the current directory and restore it at the end
    const CURRENT_DIR: string = process.cwd()

    // Move to the root of the git repository
    const REPO_ROOT: string = await repoRoot()
    cd(REPO_ROOT)

    try {
      $.verbose = true; await $`git add .`
      const args: string[] = ["-S", '-m', commitMessage]

      await $`git commit ${args}`
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      const nothingError: string = 'nothing to commit, working tree clean'

      if (error.stdout.includes(nothingError)) {
        console.log(nothingError)
      } else {
        throw error
      }

    } finally {
      cd(CURRENT_DIR)
    }
  }
}
