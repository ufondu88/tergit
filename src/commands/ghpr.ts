import { Command, Flags } from '@oclif/core';
import { setTimeout } from 'node:timers/promises';

import { askYesNoQuestion, createUpstreamBranchIfNoneExists, currentBranch, currentPRInfo, getBaseBranch, getInput, getLargeInput, isInsideGitRepo, latestCommitMessage, prAlreadyExists, sanitized } from '../utils/functions.js';

export default class Ghpr extends Command {
  static description = 'Creates a GitHub Pull Request'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --body "pr body" --base_branch "main"',
  ]

  static flags = {
    body: Flags.string({ char: 'b', description: 'body of the pull request' }),
  }

  async createPR(base: string, body: string | undefined, head: string, title: string) {
    this.log("Creating Pull Request...");

    const args: string[] = [
      '--title', title,
      '--base', base,
      '--head', head
    ]
    if (body) {
      args.push('--body', body)
    }

    const { stderr, stdout } = await $`gh pr create ${args}`

    if (stderr) {
      this.error(stderr)
    } else {
      this.log(stdout)
    }
  }

  async editPR(title: string, body: string) {
    const args: string[] = []
    const newTitle = await getInput(`Enter title (${title}): `, true)
    const useExistingPRBody = await askYesNoQuestion('Keep existing PR Body? [y/N]: ', "N")

    if (!useExistingPRBody) {
      let newBody: string;

      if (!body || body === "") {
        this.log('Enter new PR body')
        await setTimeout(2000)

        newBody = await getLargeInput()
        const terraformFormat = await askYesNoQuestion("Format as Terraform body? [y/N]: ", "N")

        if (terraformFormat) newBody = `\`\`\`hcl\n${newBody}\n\`\`\`\n`
      } else {
        newBody = body
      }

      args.push('--body', newBody)
    }

    if (newTitle || newTitle !== "") {
      args.push('--title', title)
    }

    const { stderr, stdout } = await $`gh pr edit ${args}`

    if (stderr) {
      this.error(stderr)
    } else {
      this.log(stdout)
    }
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Ghpr)
    const { body } = flags

    if (!(await isInsideGitRepo())) {
      this.error(chalk.red("Please run this command in a git repo"))
    }

    const base: string = await getBaseBranch() // base branch name
    const head: string = await currentBranch() // current branch name

    this.log(`parent branch: ${base}`);

    try {
      await createUpstreamBranchIfNoneExists(head)
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      this.error(error)
    }

    const commit: string = await latestCommitMessage() // latest commit message
    const title: string = `${head}: ${sanitized(commit)}` // constructed PR title

    if (await prAlreadyExists()) {
      try {
        const {title, url} = await currentPRInfo()
        
        this.log(`Pull request exists already:\n${url}`)
  
        const shouldEditPR = await askYesNoQuestion(`Edit pull request? [Y/n]: `)
  
        if (shouldEditPR) {
          this.editPR(title, body || "")
        }
      } catch (error) {
        console.error(error)
      }
    } else {
      this.createPR(base, body, head, title)
    }
  }
}


