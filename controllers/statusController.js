const util = require('util');
const fs = require('node:fs');
const exec = util.promisify(require('child_process').exec);
const { DateTime } = require('luxon');

exports.getStatus = async (req, res) => {
  const ret = {};
  let hash = '';
  let hashURL = '';
  let text = '';

  try {
    hash = fs.readFileSync('./git_commit_hash', 'utf8');
    hash = hash.trim();
    hashURL = `https://github.com/wevote/weconnect-server/commit/${hash}`;
    const response = await fetch(hashURL);
    text = await response.text();
  } catch (error) {
    console.log(error);
  }

  try {
    const pr = text.match(/"Merge pull request (.*?)wevote/);
    ret.Pull_request = pr[1].slice(0, -2);
    const dateStringResults = text.match(/"committedDate":"(.*?)"/);
    console.log(dateStringResults[1]);
    const date = new DateTime(dateStringResults[1]);
    ret.Git_committed_date = date.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
  } catch (error) {
    console.log(error);
  }

  try {
    ret.Git_commit_hash = `<a href="${hashURL}">${hash}</a>`;
  } catch (error) {
    ret.uname = 'uname error';
  }


  try {
    const { stdout: node } = await exec('node --version');
    ret.node = node.trim();
  } catch (error) {
    ret.node = 'node not found';
  }

  try {
    const { stdout: arch } = await exec('arch');
    ret.arch = arch.trim();
  } catch (error) {
    ret.arch = 'arch error';
  }

  try {
    const { stdout: uname } = await exec('uname -a ');
    ret.uname = uname.trim();
  } catch (error) {
    ret.uname = 'uname error';
  }

  ret.host = req.host;

  return res.json(ret);
};
