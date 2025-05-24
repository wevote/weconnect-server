const { PrismaClient } = require('@prisma/client');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
const { DateTime } = require('luxon');

/*
While debugging this feature, you can restore the database to where you were before starting the debug run
We dump the db into a text file in the root of the project
     `pg_dump WeConnectDB > ${file}`
Use pgAdmin 4 to drop the database Servers/WeVoteServer/Databases/WeConnectDB  -- right click on it and choose 'Delete (Force)'
Use pgAdmin 4 to reinitialize an empty database -- Servers/WeVoteServer/Databases  -- right click on it and choose Create/Database and enter 'WeConnectDB' and save.
Select a database dump that was before you started debugging, and should have the full data set
     psql -X -f WeConnectDBdumpfile.2025-05-20T20:03:55.sql WeConnectDB
That's it, your data is restored.
*/


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
    // eslint-disable-next-line prefer-destructuring
    const host = req.host;
    // console.log('req.host: ', stdout);
    if (host.includes('wevote.org') || host.includes('wevote.us')) {
      console.error('Attempted to run localReplaceTable on host teamapi.wevote.org!');
      return false;
    }
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

function getMostRecentDumpFileCreationTime () {
  const files = fs.readdirSync('./');

  if (files.length > 0) {
    const dumpFiles = [];
    files.forEach((file) => {
      if (file.startsWith('WeConnectDBdumpfile')) {
        dumpFiles.push(file);
      }
    });

    if (dumpFiles.length > 0) {

      const sortedFiles = dumpFiles.map((file) => ({
        name: file,
        time: fs.statSync(`./${file}`).mtime.getTime(),
      })).sort((a, b) => b.time - a.time);
      return new DateTime(sortedFiles[0].time);
    }
  }
  return new DateTime().minus({ year: 1 });  // pretend year ago date, so we will do a backup
}

const backupTheDatabase = async () => {
  // Since the db files are backed up one-by-one, we want to run the full WeConnectDB backup less often
  const priorFastLoadDate = await getMostRecentDumpFileCreationTime();
  if (priorFastLoadDate.plus({ minutes: 5 }) < DateTime.now()) {
    let date = DateTime.now().toISO();
    date = date.slice(0, -10);
    const file = `WeConnectDBdumpfile.${date}.sql`;  // example: WeConnectDBdumpfile.2025-05-20T16:27:27.sql
    const command = `pg_dump WeConnectDB > ${file}`;
    console.log(command);
    await exec(command);
    return true;
  }
  return false;
};

const emptyTheTable = async (tableName) => {
  const command = `TRUNCATE TABLE "${tableName}"  RESTART IDENTITY CASCADE;`;
  console.log(command);
  try {
    await prisma.$executeRawUnsafe(command);
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const fillTheTable = async (tableName, tableJSON) => {
  const outTempFile = `/tmp/${tableName}.tsv`;
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
    line = line.replace('\n', '');
    line = line.slice(0, -1);
    tableTSV += `${line}\n`;
    // console.log(tableTSV);
  });

  try {
    fs.unlinkSync(outTempFile);
  } catch {
    console.log(`Did not find ${tableName} so an old copy was not removed.`);
  }
  fs.writeFileSync(outTempFile, tableTSV);
  const sql = `COPY "${tableName}" FROM '${outTempFile}';`;
  const set = 'SET session_replication_role = \'replica\';';
  const unset = 'SET session_replication_role = \'origin\';';
  await prisma.$queryRawUnsafe(set);
  console.log('fillTheTable queryRawUnsafe: ', sql);
  await prisma.$queryRawUnsafe(sql);
  console.log('fillTheTable queryRawUnsafe: ', set);
  await prisma.$queryRawUnsafe(unset);
  console.log('fillTheTable queryRawUnsafe: ', unset);
};

// Some fields have '\n' in the strings, clean them out.  Ideally we would have never saved strings like this.
const cleanNewLinesOutOfJSON = (tableJSON) => {
  tableJSON.forEach((object) => {
    const keys = Object.keys(object);
    keys.forEach((key) => {
      const value = object[key];
      if (typeof value === 'string' || value instanceof String) {
        // eslint-disable-next-line no-param-reassign
        object[key] = value.replace(/\r?\n/g, '');
      }
    });
  });
};


exports.localReplaceTable = async (req, res) => {
  const { tablePacket: { tableName, tableJSON } } = req.body;
  console.log('localReplaceTable for table: ', tableName);
  let success = true;
  let didFill = false;
  let didEmpty = false;
  let error = '';

  // If localReplaceTable was somehow run successfully on the production server
  // it would wipe out the production database, so being very careful here
  const local = await isLocal(req);
  if (local) {
    await backupTheDatabase();

    if (tableJSON?.length) {
      didEmpty = await emptyTheTable(tableName);
      cleanNewLinesOutOfJSON(tableJSON);
      didFill = await fillTheTable(tableName, tableJSON);
    } else {
      error = `Received no data for table: ${tableName}`;
    }
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
