# script

## Git

### Setup

Automate Git and SSH configuration.

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/serosme/script/main/git/setup.sh)
```

### PS1

```bash
echo 'export PS1="> "' >> ~/.bash_profile && source ~/.bash_profile
```

### Windows Terminal

```json
{
  "name": "Git Bash",
  "icon": "C:\\Users\\User\\scoop\\apps\\git\\current\\git-bash.exe",
  "commandline": "C:\\Users\\User\\scoop\\apps\\git\\current\\bin\\bash.exe --login -i",
  "startingDirectory": "%USERPROFILE%"
}
```

## WSL

### Config

Configure `/etc/wsl.conf` to disable interop and Windows path appending.

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/serosme/script/main/wsl/wsl-config.sh)
```

## Docker

### Install

Install Docker CE via USTC mirror.

```bash
curl -fsSL https://raw.githubusercontent.com/serosme/script/main/docker/install.sh | sudo bash
```

## GitHub

### Clean

Clean up GitHub Actions workflow runs and artifacts.

```bash
node gh/clean.cjs
```
