Tergit is a command line tool to perform Terraform and git related operations. In it's current state, Terraform commands assume the repo is sysconf.


To install tergit, run this command in the root of the tergit directory

```
chmod +x install.sh && ./install.sh
```

To use the tool to it's full capacity, please run
```
gh auth login
```
This will authenticate GitHub CLI on your machine

To see all available commnands, run

```
tergit --help
```

After installation, you may choose to put these aliases into your .bashrc or .zshrc file to make using the commands a bit simpler

```
alias gac="tergit gac"
alias ghpr="tergit ghpr"
alias gpacp="tergit gpacp"
alias gpcb="tergit gpcb"
alias sysconf="tergit sysconf"
alias tfa="tergit tfa"
alias tfi="tergit tfi"
alias tfip="tergit tfip"
alias tfp="tergit tfp"
```
