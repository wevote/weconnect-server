# WeVote weconnect-server

[![Build Status](https://travis-ci.org/wevote/weconnect-server.svg?branch=develop)](https://travis-ci.org/wevote/WebApp)

This **weconnect-server** git repository contains the code for WeVote's Node Javascript application server.
* Node is the interpreter/compiler for server based JavaScript (JavaScript not running in a browser).
* The **weconnect-server** 
   * is based on the excellent [Hackathon Starter](https://github.com/sahat/hackathon-starter) "A kickstarter for Node.js Web applications". (But we don't use it as a Web app.)
   * is a backend API server "written in Node" to support our React [weconnect](https://github.com/wevote/weconnect) front end client.
   * uses the Express.js application server to run our app, and serve up HTTP requests.
   * uses the Prisma.js ORM (Object Relational Model) to read and write from our PostgreSQL database server.
<br><br>

Interested in [volunteering or applying for an internship](https://wevote.applytojob.com/apply)? [Starting presentation here](https://prezi.com/p/6iu9aks7zqvs/?present=1).
Please also [read about our values](https://docs.google.com/document/d/12qBXevI3mVKUsGmXL8mrDMPnWJ1SYw9zX9LGW5cozgg/edit) and
[see our Code of Conduct](https://github.com/wevote/WebApp/blob/435304bc1edd7a8d4d0abdae8c46a533a0ecf52c/CODE_OF_CONDUCT.md)
To join us, please [review our openings here](https://wevote.applytojob.com/apply), and apply for a volunteer position through that page.

Our current version of our public facing web app is here [https://WeVote.US](https://WeVote.US), and we are working on a new version now!

# Docker Installation

The fastest way to get started with weconnect-server is by using Docker compose. See [docs/DockerSetup.md](docs/DockerSetup.md) for instructions.

# Advanced Installation

Detailed installation instructions are at [docs/InitialSetupSteps.md](docs/InitialSetupSteps.md)
