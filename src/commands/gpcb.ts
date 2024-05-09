import { Args, Command, Flags } from '@oclif/core'

import { defaultBranch, isInsideGitRepo } from '../utils/functions.js'

export default class Gpcb extends Command {
  static args = {
    childBranch: Args.string({ char: 'c', description: 'child branch' }),
  }

  static description = 'Performs git pull, and then changes branch to the desired branch'

  static examples = [
    '# checkout the repo\'s default branch and pull from remote \n<%= config.bin %> <%= command.id %> ',

    '# create a new local branch off the repo\'s default branch. If branch already exists locally, switch to branch \n<%= config.bin %> <%= command.id %> "new_branch"',

    '# create a new local branch off the "dev" branch. If branch already exists locally, switch to branch \n<%= config.bin %> <%= command.id %> "new_branch" -p "dev"',
  ]

  static flags = {
    parentBranch: Flags.string({ char: 'p', description: 'parent branch' }),
  }

  public async run(): Promise<void> {
    $.verbose = false

    const { args, flags } = await this.parse(Gpcb)
    let { parentBranch } = flags
    const { childBranch } = args

    if (!(await isInsideGitRepo())) {
      this.error(chalk.red("Please run this command in a git repo"))
    }

    // if parent branch is not provided, set to the repo's default branch
    if (!parentBranch) {
      parentBranch = await defaultBranch()
    }

    this.log(`parent branch: ${parentBranch}`)

    $.verbose = true

    await $`git checkout ${parentBranch} && git pull`

    // if a child branch is provided, switch to the child branch
    if (childBranch) {
      try {
        await $`git checkout -b ${childBranch}`
      } catch {
        this.warn(`branch ${childBranch} exists locally already. Checking out local branch`)
        await $`git checkout ${childBranch}`
      }
    }
  }
}
