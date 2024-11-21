=======================


Table of Contents
-----------------

- [Features](#features)
- [Prerequisites](#prerequisites)

Getting Started
---------------

**Step 1:** Install virtual environment system (Macintosh):

```bash
# Change to your personal directory
cd ~

# Download the installation package
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"

# Install python
brew install python

# Use python to install pip
curl https://bootstrap.pypa.io/get-pip.py

# Now install nodeenv with pip. Install nodeenv globally.
# (For instructions installing it locally, see: https://github.com/ekalinin/nodeenv):
sudo -H pip3 install nodeenv

# If you are already using Node and npm, confirm that your installation is
# at least at these minimum versions:

node -v
# Should show: v10.12.0

npm -v
# Should show: 6.4.1
    
# If you find that your Mac, does not have Node installed, install it with brew. (If you want to have
# a fresh install of Node you can `brew unlink node` first.)  A fresh or initial install of Node,
# will automatically install the latest version of npm.

brew install node
node -v
npm -v

# Create a place for your weconnect-server virtual environment to live on your hard drive.
# We recommend installing it away from the WebApp source code:

mkdir ~/NodeEnvironments/
cd ~/NodeEnvironments/

# Create a new virtual environment in that 'NodeEnvironments' folder. This can take many minutes.
nodeenv WeConnectEnv

# Activate this new virtual environment:
cd ~/NodeEnvironments/WeConnectEnv/
. bin/activate

# Save to a notepad you can use every day you start programming, and capture
# these commands, customized for your machine:
cd ~/NodeEnvironments/WeConnectEnv/
. bin/activate
cd ~/MyProjects/weconnect-server
```

**Step 2:** Clone the repository to your machine:

```bash
# Change into directory where you want to keep the code
cd ~/MyProjects/

# Get the latest snapshot
git clone https://github.com/wevote/weconnect-server.git weconnect-server

# Change directory
cd weconnect-server

# Install NPM dependencies
npm install

# Then simply start your app
node app.js
```

Credits &amp; Thanks
---------------

Mad respect to [Hackathon Starter](https://github.com/sahat/hackathon-starter)

License
-------

The MIT License (MIT)

Copyright (c) 2024 We Vote USA
Forked from Hackathon Starter Copyright (c) 2024 Sahat Yalkabov

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
