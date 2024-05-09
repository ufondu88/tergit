#!/bin/bash

# Evaluate configFile and store the output in 'file'
configFile="$HOME/.tergit.cfg"
file=$(eval "echo ${configFile}")
file=$(echo "$file" | tr -d '\r')  # Remove any carriage return characters
file=$(echo "$file" | tr -d '\n')  # Remove any newline characters

# Trim leading and trailing whitespace
file=$(echo -e "$file" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')

# Check if the config file exists
if [ ! -f "$file" ]; then
  echo "config file does not exist. Creating one now..."
  echo "plan_output_directory = ${file}/terraform_plans" > "$file"
else
  echo "config file already exists"
fi

# Function to install necessary packages on macOS
function installPackagesMacOS() {
  # Install Homebrew (if not already installed)
  if ! command -v brew &> /dev/null; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  fi

  # Update Homebrew and install Node.js and npm
  brew update
  brew install npm

  brew install gh
}

# Function to install necessary packages on Linux
function installPackagesLinux() {
  # install node and npm
  apt update
  apt install curl npm -y

  # install GH CLI
  apt-get install gh -y
}

# Check current platform and install necessary packages if not installed
function installPackagesDependingOnPlatform() {
  platform=$(uname)

  echo "Environment: $platform"

  case $platform in
    "Darwin"*)
      installPackagesMacOS
      ;;
    "Linux"*)
      installPackagesLinux
      ;;
    *)
      echo "Unsupported platform for installation."
      ;;
  esac
}



# Run the function to install necessary packages depending on the platform
installPackagesDependingOnPlatform

npm install -g n
n stable

hash -r
npm install
npm run build

# Run npm link
result=$(npm link)

echo "$result"

# Check if npm link failed due to missing file
if [[ "$result" == *"This is related to npm not being able to find a file"* ]]; then
  echo "Please run the tergit install command from the root of the tergit repo"
else
  echo "Error: $result"
fi

echo "Please run 'gh auth login' to authenticate the GitHub CLI if you haven't already done so"