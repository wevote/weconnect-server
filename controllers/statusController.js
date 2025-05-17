const util = require('util');
const exec = util.promisify(require('child_process').exec);

exports.getStatus = async (req, res) => {
  const ret = {};

  try {
    const { stdout: node } = await exec('node --version');
    ret.node = node.trim();
  } catch (error) {
    ret.node = 'node not found';
  }

  try {
    const { stdout: dump } = await exec('pg_dump --version');
    ret.pg_dump = dump.trim();
  } catch (error) {
    ret.pg_dump = 'pg_dump not found';
  }

  try {
    const { stdout: uname } = await exec('uname -a ');
    ret.uname = uname.trim();
  } catch (error) {
    ret.uname = 'uname error';
  }

  try {
    const { stdout: arch } = await exec('arch');
    ret.arch = arch.trim();
  } catch (error) {
    ret.arch = 'arch error';
  }

  try {
    const { stdout: psql } = await exec('psql --version');
    ret.psql = psql.trim();
  } catch (error) {
    ret.psql = 'psql not found';
  }

  try {
    const { stdout: zipTxt } = await exec('zip --version');
    const re = /^.*?\d\.\d.*?$/m;
    ret.zip = re.exec(zipTxt)[0];
  } catch (error) {
    ret.zip = 'zip not found';
  }

  try {
    const { stdout: prismaTxt } = await exec('prisma --version', { shell: '/bin/zsh' });
    let re = /^prisma\s\s.*?(\d.\d.\d)$/gm;
    ret.prisma = re.exec(prismaTxt)[1];
    re = /^@prisma.*?(\d.\d.\d)$/gm;
    ret.prisma_client = re.exec(prismaTxt)[1];
    re = /^Operating System\s\s*: (.*?)$/gm;
    ret.os = re.exec(prismaTxt)[1];
    re = /^Architecture.*?: (.*?)$/gm;
    ret.arch = re.exec(prismaTxt)[1];
  } catch (error) {
    if (!ret.prisma) ret.prisma = 'prisma cli client not found';
  }


  return res.json(ret);
};
