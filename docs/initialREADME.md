Table of Contents
-----------------

- [Getting Started](#getting-started)
  - [Step1: Virtual Environment](#step-1-install-virtual-environment-system-macintosh)
  - [Step2: Clone Repository](#step-2-clone-the-repository-to-your-machine)
  - [Step3: Start your local postgres server](#step-3-start-your-local-postgres-server)
  - [Step4: Configuration Variables](#step-4-configuration-variables)
  - [Step5: Start this node app](#step-5-start-this-node-app)
- [Credit & Thanks](#credits--thanks)
- [License](#license)

Getting Started
---------------

## **Step 1:** Install virtual environment system (Macintosh):

### Change to your personal directory
```
cd ~
```

### Download the installation package
```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
```

### Install python

<!-- 11/24/24:  This seems like an unnecessary complication... bringing in python and their venv.  See [jetbrains]&#40;https://intellij-support.jetbrains.com/hc/en-us/community/posts/4405137278610-How-do-I-create-and-activate-a-virtual-environment-in-WebStorm&#41;) -->
<!-- All the environment variables for this project are set in .env.config, all that leaves you with is the latest Node.js, which should be installed globally  -->
<!-- (We should come up with a "simplified" WebStorm based install. Now that WebStorm is free for WeVote developers.  WebStorm is a great Node.js editor and debugger. -->

```
brew install python
```

### Use python to install pip
```
curl https://bootstrap.pypa.io/get-pip.py
```

### Now install nodeenv with pip. Install nodeenv globally.
(For instructions installing it locally, see: https://github.com/ekalinin/nodeenv):
```
sudo -H pip3 install nodeenv
```

### If you are already using Node and npm, confirm that your installation is at least at these minimum versions:
```
node -v
```

(Should show this or higher: v22.11.0)

```
npm -v
```

(Should show this or higher: 10.9.0)

### If you find that your Mac, does not have Node installed, install it with brew. 
(If you want to have a fresh install of Node you can `brew unlink node` first.)  
A fresh or initial install of Node, will automatically install the latest version of npm.
```
brew install node
node -v
npm -v
```

### Create a place for your weconnect-server virtual environment to live on your hard drive.
We recommend installing it away from the WebApp source code:
```
mkdir ~/NodeEnvironments/
cd ~/NodeEnvironments/
```

### Create a new virtual environment in that 'NodeEnvironments' folder. This can take many minutes.
```
nodeenv WeConnectEnv
```

#### Activate this new virtual environment:
```
cd ~/NodeEnvironments/WeConnectEnv/
. bin/activate
```

### Save to a notepad you can use every day you start programming, and capture these commands, customized for your machine:
```
cd ~/NodeEnvironments/WeConnectEnv/
. bin/activate
cd ~/WebstormProjects/weconnect-server
```

### **Step 2:** Clone the repository to your machine:

### Change into directory where you want to keep the code
```
cd ~/WebstormProjects/
```

### Get the latest snapshot
```
git clone https://github.com/wevote/weconnect-server.git weconnect-server
```

### Change directory
```
cd weconnect-server
```
### Install NPM dependencies
```
npm install
```

### **Step 3:**  Start your local postgres server

### Make sure your local postgres is running on port 5432
For me, the command to start postgres is...
```
  pg_ctl -D /opt/homebrew/var/postgres -l /opt/homebrew/var/postgres/server.log start
```
### If you are using a local postgres server (only do this once)
Use pgAdmin4 to create the WeConnectDB database on the existing server
(Not sure if this is necessary Prisma might do this for you)

### Create the database
Nov 22, 2024: I'm unsure of these steps -- need to test them on a new Mac.  See [InitialSetupSteps.md](./docs/InitialSetupSteps.md)

```bash
npx prisma init
npx prisma db push
```

### **Step 4:** Configuration variables

### Change into directory where you keep code
```
cd ~/WebstormProjects/weconnect-server
```
### Get the latest snapshot from the template
```
cp .env.config-template .env.config
Then open .env.config in WebStorm (or any editor)
```

### Configure your DATABASE_URL in the  .env.config file

Configure your DATABASE_URL in '.env.config' by making the appropriate substitutions to ...
```
  DATABASE_URL=postgresql://{youruserloginname}:{yourloginpassword}@localhost:5432/WeConnectDB?schema=public
```

Here is a filled in example:

```
DATABASE_URL=postgresql://jerrygarcia:jerryspassword@localhost:5432/WeConnectDB?schema=public
```

### **Step 5:**  Start this node app
### Simply start your app

```
node app.js
```

### Debugging the app
You can use the excellent debugger within the WebStorm IDE if you make a run configuration.

<img src="./images/WebStormRunConfiuration.png" alt="Alt Text" width="600" >

All you need to fill in is the name field, and the JavaScript field, as shown in the screen shot above.

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
