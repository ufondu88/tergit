import { Args, Command } from '@oclif/core'

import { createUpstreamBranchIfNoneExists, currentBranch, isInsideGitRepo, repoRoot } from '../utils/functions.js'
import Gac from './gac.js'

export default class Gpacp extends Command {
  static args = {
    commitMessage: Args.string({ description: 'Commit message to use with the commit', required: true }),
  }

  static description = 'Performs git pull, add, commit and push'

  static examples = [
    '# push new commit to remote with the specified commit message\n<%= config.bin %> <%= command.id %> "this is a commit message"',
  ]

  public async run(): Promise<void> {
    const { args } = await this.parse(Gpacp)
    const { commitMessage } = args

    if (!(await isInsideGitRepo())) {
      this.error(chalk.red("Please run this command in a git repo"))
    }

    const CURRENT_DIR: string = process.cwd() // Save the current directory and restore it at the end
    const branch: string = await currentBranch() // current branch name
    const REPO_ROOT: string = await repoRoot() // root of the git repo

    // Move to the root of the git repository
    cd(REPO_ROOT)

    try {
      $.verbose = true; await createUpstreamBranchIfNoneExists(branch, true)
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      this.error(error)
    }

    $.verbose = false

    // const commitThem = chalk.white.bgGreen.bold
    // const pushTheme = chalk.green.bgWhite.bold

    this.log("Committing changes...")

    // Git add and commit
    try {
      await Gac.run([commitMessage])
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      this.log(error)
      if (error.stdout && error.stdout.toString().includes('nothing to commit')) {
        this.log(chalk.yellow('nothing to commit, working tree clean'))
      } else {
        this.error(error)
      }
    }

    this.log("Pushing changes...")

    // Git push
    try {
      $.verbose = true; await $`git push`
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (error.stderr.includes('Protected branch update failed')) {
        this.error('Protected branch update failed. Changes must be made through a pull request')
      } else if (error.stderr.includes('has no upstream branch')) {
        await $`git push --set-upstream origin ${branch}`
      }
    }

    // change to the original directory
    cd(CURRENT_DIR)
  }
}
