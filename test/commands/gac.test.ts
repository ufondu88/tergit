import { expect, test } from '@oclif/test';
import { createSandbox } from 'sinon';  // eslint-disable-line n/no-extraneous-import

// import Gac from '../../src/commands/gac.ts';
import * as functions from '../../src/utils/functions.ts';

describe('gac', () => {
  // let repoStub: SinonStub
  // const commitMessage = 'commit message'

  const sandbox = createSandbox();
  beforeEach(() => {
    // repoStub = sandbox.stub(functions, 'isInsideGitRepo').resolves(true); // Stub isInsideGitRepo to return true by default  
    // sandbox.stub()
  });

  afterEach(() => {
    sandbox.restore();
  });

  test
    .stdout()
    .stderr()
    .stub(functions, 'isInsideGitRepo', sandbox.stub().resolves(true))
    .stub(functions, 'repoRoot', sandbox.stub().returns('/path/to/repo'))
    .it('runs gac command with commit message', ctx => {
      expect(ctx.stdout).to.contain('commit message')
    })

  test
    .stdout()
    .stderr()
    .stub(functions, 'isInsideGitRepo', sandbox.stub().resolves(false))
    .command(['gac', 'commit message'])
    .exit(1)
    .it('exits with error if not inside a git repo')

  // test
  //   .stdout()
  //   .stderr()
  //   .stub(functions, 'isInsideGitRepo', sandbox.stub().resolves(true))
  //   .stub(functions, 'repoRoot', sandbox.stub().returns('/path/to/repo'))
  //   .stub(functions, 'cd', () => { })
  //   .stub(functions, '$', async () => { })
  //   .command(['gac', 'commit message'])
  //   .it('runs git add and git commit commands', ctx => {
  //     expect(ctx.stdout).to.contain('commit message')
  //   })

  // test
  //   .stdout()
  //   .stderr()
  //   .stub(functions, 'isInsideGitRepo', sandbox.stub().resolves(true))
  //   .stub(functions, 'repoRoot', sandbox.stub().returns('/path/to/repo'))
  //   .stub(functions, 'cd', () => { })
  //   .stub(functions, '$', async () => {
  //     throw new Error('nothing to commit, working tree clean')
  //   })
  //   .command(['gac', 'commit message'])
  //   .it('outputs nothing to commit message if working tree clean', ctx => {
  //     expect(ctx.stdout).to.contain('nothing to commit, working tree clean')
  //   })

  // test
  //   .stdout()
  //   .stderr()
  //   .stub(functions, 'isInsideGitRepo', sandbox.stub().resolves(true))
  //   .stub(functions, 'repoRoot', sandbox.stub().returns('/path/to/repo'))
  //   .stub(functions, 'cd', () => { })
  //   .stub(functions, '$', async () => {
  //     throw new Error('some other error')
  //   })
  //   .command(['gac', 'commit message'])
  //   .exit(1)
  //   .it('exits with error if git commands fail with other errors')
});
