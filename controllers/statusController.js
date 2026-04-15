const util = require('util');
const fs = require('node:fs');
const exec = util.promisify(require('child_process').exec);
const { DateTime } = require('luxon');
const { execSync } = require('child_process');

exports.getStatus = async (req, res) => {
  const stats = {};
  try {
    stats.nodeVersion = execSync('node --version').toString().trim();
    stats.npmVersion = execSync('npm --version').toString().trim();
  } catch (error) {
    console.log('ERROR in getGitValues node/npm: ', error);
  }
  try {
    console.log('Working Directory: ', __dirname);
    let hash = fs.readFileSync('./git_commit_hash', 'utf8');
    hash = hash.trim();
    console.log('Hash: ', hash);
    const hashURL = `https://github.com/wevote/weconnect-client/commit/${hash}`;
    console.log('hashURL: ', hashURL);

    // Use the GitHub REST API instead of scraping HTML — works for all commit types
    const apiHeaders = { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'weconnect-client-build' };

    // Get commit details (date)
    const commitResponse = await fetch(`https://api.github.com/repos/wevote/weconnect-client/commits/${hash}`, { headers: apiHeaders });
    if (!commitResponse.ok) {
      throw new Error(`GitHub API returned ${commitResponse.status} for commit ${hash}`);
    }
    const commitData = await commitResponse.json();
    let committedDate;
    try {
      committedDate = commitData.commit.committer.date || commitData.commit.author.date;
    } catch (error) {
      committedDate = commitData.commit.author.date;
    }
    console.log('committedDate: ', committedDate);
    const date = new DateTime(committedDate);
    stats.Git_committed_date = date.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
    stats.Git_commit_hash = `<a href="${hashURL}">${hash}</a>`;

    // Get associated pull request number
    const prsResponse = await fetch(`https://api.github.com/repos/wevote/weconnect-client/commits/${hash}/pulls`, { headers: apiHeaders });
    if (prsResponse.ok) {
      const prs = await prsResponse.json();
      if (prs.length > 0) {
        stats.Pull_request = `#${prs[0].number}`;
        console.log('Pull_request: ', stats.Pull_request);
      } else {
        stats.Pull_request = 'none';
      }
    } else {
      stats.Pull_request = 'none';
      stats.Git_committed_date = 'none';
      stats.Git_commit_hash = 'Not Found';
    }
  } catch (error) {
    console.log('Error in getStatusValues git: ', error);
    stats.Pull_request = 'none';
    stats.Git_committed_date = 'none';
    stats.Git_commit_hash = 'none';
  }

  try {
    const { stdout: node } = await exec('node --version');
    stats.node = node.trim();
  } catch (error) {
    stats.node = 'node not found';
  }

  try {
    const { stdout: arch } = await exec('arch');
    stats.arch = arch.trim();
  } catch (error) {
    stats.arch = 'arch error';
  }

  try {
    const { stdout: uname } = await exec('uname -a ');
    stats.uname = uname.trim();
  } catch (error) {
    stats.uname = 'uname error';
  }

  stats.host = req.host;

  return res.json(stats);
};
