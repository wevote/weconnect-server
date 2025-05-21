const { PrismaClient } = require('@prisma/client');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
const { DateTime } = require('luxon');


// eslint-disable-next-line no-unused-vars
const prisma = new PrismaClient();

const isLocal = async (req) => {
  // Linux ip-10-0-182-109.us-west-2.compute.internal 5.10.235-227.919.amzn2.x86_64 #1 SMP Sat Apr 5 16:59:05 UTC 2025 x86_64 GNU/Linux
  try {
    const { stdout } = await exec('uname -a ');
    if (stdout.startsWith('Linux') || stdout.endsWith('x86_64 GNU/Linux') || stdout.includes('.amzn2.')) {
      console.log('uname: ', stdout);
      console.error('Attempted to run localReplaceTable on an AWS instance!');
      return false;
    }
    const host = req.host;
    if (!host.startsWith('wevotedeveloper.com')) {
      console.log('req.host: ', stdout);
      console.error('Attempted to run localReplaceTable on a host other than wevotedeveloper.com!');
      return false;
    }
  } catch (error) {
    console.error('uname error', error);
    return false;
  }
  return true;
};

const backupTheDatabase = async () => {
  try {
    // since the db files are backed up one by one, we only want to backup less often
    // Find the date of the first and last in the set of temp files
    let command = 'ls -lat /tmp/ | grep -m1 TeamToTeamRoleLink';
    const resp = await exec(command);
    console.log('RESPONSE', resp?.stdout);
    const dateSplit = resp?.stdout.split(' ');
    const dateStr = `${dateSplit[14]} ${dateSplit[15]} ${dateSplit[16]}`;
    console.log('RESPONSE', dateStr);
    const priorFastLoadDate = new DateTime(dateStr);

    //   -rw-r--r--@   1 stevepodell  wheel       0 May 20 16:29 TeamToTeamRoleLink
    // Don't backup local db if the last {table}.sql was written to /tmp within 5 minutes
    if (priorFastLoadDate.plus({ minutes: 5 }) < DateTime.now()) {
      console.log('RESPONSE', priorFastLoadDate);
      let date = DateTime.now()
        .toISO();    // WeConnectDBdumpfile2025-05-20T16:07:06.075-07:00
      date = date.slice(0, -10);
      const file = `WeConnectDBdumpfile.${date}.sql`;
      command = `pg_dump WeConnectDB > ${file}`;
      console.log(command);
      await exec(command);
      return true;
    }
  } catch (error) {
    console.log({ error });
    return false;
  }
  return false;
};

const emptyTheTable = async (tableName) => {
  try {
    const command = `TRUNCATE TABLE ${tableName};`;
    console.log(command);
    // await prisma.$executeRawUnsafe();
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const fillTheTable = async (tableName, tableJSON) => {
  let tableTSV = '';
  tableJSON.forEach((element) => {
    // console.log(element);
    // const keys = Object.keys(element);
    const values = Object.values(element);
    let line = '';
    values.forEach((val) => {
      if (val === 'null' || val === null) {
        line += '\\N\t';
      } else {
        line += `${val}\t`;
      }
    });
    // console.log(line);
    tableTSV += `${line}\n`;
    // console.log(tableTSV);
  });
  const outTempFile = `/tmp/${tableName}`;
  try {
    fs.unlinkSync(outTempFile);
  } catch {
    // if the file does not exist (not a problem)
  }
  fs.writeFileSync(outTempFile, tableTSV);
  const sql = `COPY ${tableName} FROM ${outTempFile};`;
  console.log('fillTheTable', sql);
  // don't run command this until I can get the data from the production server
};

exports.localReplaceTable = async (req, res) => {
  const { tablePacket: { tableName, tableJSON } } = req.body;
  let success = true;
  let didFill = false;
  let didEmpty = false;
  let error = '';

  // If localReplaceTable was somehow successfully run on the production server
  // it would wipe out the production database, so being very careful here
  const local = await isLocal(req);
  if (local) {
    backupTheDatabase();

    didEmpty = emptyTheTable(tableName);
    didFill = fillTheTable(tableName, tableJSON);
  } else {
    success = false;
    error = 'Attempted to run localReplaceTable on an AWS instance!';
  }

  return res.json({
    success,
    error,
    didEmpty,
    didFill,
    isLocal: local,
  });
};
