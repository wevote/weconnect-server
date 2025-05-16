const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { PrismaClient } = require('@prisma/client');
const { DateTime } = require('luxon');
const { uniqueNamesGenerator, animals, names } = require('unique-names-generator');
const { allowableTables } = require('./allowableTables');

const prisma = new PrismaClient();

// https://www.postgresql.org/docs/current/sql-createtableas.html
exports.makeTempTable = async (tableName, tempTableName) => {
  let query = `DROP TABLE "${tempTableName}";`;
  try {
    try {
      await prisma.$queryRawUnsafe(query);
    } catch (error) {
      console.log(`Table ${tempTableName} was not dropped since it did not exist`);
    }
    query = `CREATE TEMP TABLE "${tempTableName}" AS TABLE "${tableName}";`;
    await prisma.$queryRawUnsafe(query);
    return true;
  } catch (error) {
    console.error('makeTempTable', error);
    return false;
  }
};

/*
"""
Returns the maximum id of table to be fetched from the MASTER server
Runs on the Master server
  :return: the number of rows
"""
 */
const getMaxId = async (tableName) => {
  try {
    const query = `SELECT MAX(id) FROM "${tableName}";`;
    // const result = await prisma.$queryRaw{query}`;
    const result = await prisma.$queryRawUnsafe(query);
    const { max } = result[0];
    return max;
  } catch (error) {
    if (error.meta.code === '42703') { // column "id" does not exist for tables with @@unique composite id and no data
      console.log(`getMaxId for table ${tableName}, "id" does not exist for tables with @@unique composite id and no data`);
    } else {
      console.error(error);
    }
    return 0;
  }
};


exports.getTotalRowCount = async () => {
  let rows = 0;
  for (let i = 0; i < allowableTables.length; i++) {
    const tableName = allowableTables[i];
    // eslint-disable-next-line no-await-in-loop
    rows += await this.getMaxId(tableName);
    console.log(`rows after ${tableName} --- ${rows}`);
  }
  return rows;
};

const globalFirstNameSubstitutions = {};
const globalLastNameSubstitutions = {};
const globalEmailSubstitutions = {};

const copyTempTableToFile = async (tempTableName) => {
  try {
    const pathRows = `${process.env.PATH_FOR_TEMP_FILES}/steveCopy${tempTableName}.${DateTime.now().toISO()}.rows`;
    const pathZip = pathRows.replace('.rows', '.zip');
    const query = `COPY "${tempTableName}" to '${pathRows}'`;
    console.log(`dumpDatabaseTableToTmp: ${query}`);
    // create a tab seperated file of rows of sql entries
    await prisma.$queryRawUnsafe(query);
    const zipCmd = `zip ${pathZip} ${pathRows}`;
    const { stdout } = await exec(zipCmd);
    console.log(stdout);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

exports.getAnonymizedTable = async (tableName) => {
  const colNames = [];
  const firstNameFields = [];
  const lastNameFields = [];
  const emailFields = [];

  // Make temp table, that is tied to this session
  const tempTableName = `${tableName}_temp`;
  await this.makeTempTable(tableName, tempTableName);
  const maxId = await getMaxId(tableName);

  try {
    const query = `SELECT column_name
                   FROM information_schema.columns 
                   WHERE table_name = '${tempTableName}'
                   ORDER BY ordinal_position;`;
    const colNamesObjs = await prisma.$queryRawUnsafe(query);
    colNamesObjs.forEach((obj) => {
      colNames.push(obj.column_name);
    });
    // console.log('getAnonymizedTable select column_name', colNames);
  } catch (error) {
    console.error(error);
  }

  colNames.forEach((colName) => {
    if (colName.toLowerCase().includes('name')) {
      if (colName.toLowerCase().includes('first')) {
        firstNameFields.push(colName);
      } else {
        lastNameFields.push(colName);
      }
    }
  });

  const excludedEmailFields = ['emailOfficialVerified', 'emailPersonalOkToShare', 'emailVerificationToken', 'emailVerified',
    'dateEmailCreated', 'statusEmailCreated'];
  colNames.forEach((colName) => {
    if (colName.toLowerCase().includes('email')) {
      if (!excludedEmailFields.includes(colName)) {
        emailFields.push(colName);
      }
    }
  });

  /* eslint-disable no-await-in-loop */
  for (let id = 1; id <= maxId; id++) {
    // find them in the live table
    const person = await prisma.person.findUnique({ where: { id } });

    if (person && !(person.emailPersonal === '' && person.emailOfficial === '')) {
      // console.log('makeTempTable', person);
      let sql = `UPDATE "${tempTableName}"
                 SET `;
      let newFirstName = '';
      if (globalFirstNameSubstitutions[person?.firstName]) {
        newFirstName = globalFirstNameSubstitutions[person.firstName];
      } else if (person?.firstName) {
        newFirstName = await uniqueNamesGenerator({ dictionaries: [names] });
        globalFirstNameSubstitutions[person.firstName] = newFirstName;
      }
      if (newFirstName) {
        firstNameFields.forEach((field) => {
          sql = `${sql} "${field}" = '${newFirstName}', `;
        });
      }

      if (person.lastName === 'Paige') {
        console.log(person);
      }

      let newLastName = '';
      if (globalLastNameSubstitutions[person?.lastName]) {
        newLastName = globalLastNameSubstitutions[person.lastName];
      } else if (person?.lastName) {
        newLastName = await uniqueNamesGenerator({ dictionaries: [animals]});
        globalLastNameSubstitutions[person.lastName] = newLastName;
      }
      let newLastCapitalized = newLastName.slice(1);
      newLastCapitalized = newLastName.charAt(0).toUpperCase() + newLastName.slice(1); // Capitalize first letter and add the rest

      lastNameFields.forEach((field) => {
        sql = `${sql}"${field}" = '${newLastCapitalized}', `;
      });

      emailFields.forEach((field) => {
        let newEmail = '';
        if (person[field]) {
          if (globalEmailSubstitutions[person[field]]) {
            newEmail = globalEmailSubstitutions[person[field]];
          } else {
            const email = person[field];
            const index = email.indexOf('@');
            if (index < 2) {
              console.log(`email problem for ${field} with value ${email}, skipping field`);
            }
            newEmail = `${newFirstName}.${newLastName}${email.substring(index)})`;
            newEmail = newEmail.replace(')', '').toLowerCase();
            globalEmailSubstitutions[person[field]] = newEmail;
          }
          sql = `${sql}"${field}" = '${newEmail}', `;
        }
      });

      sql = sql.slice(0, -2);
      sql += ` WHERE id = '${id}';`;
      // console.log(sql);
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (error) {
        console.error('Row UPDATE error', error);
      }
    } else {
      console.log(`No data for row ${id} in ${tableName}`);
    }
  }
  const zippedTempFileName = await copyTempTableToFile(tempTableName);
  console.log(zippedTempFileName);
  return zippedTempFileName;
};

exports.getFastLoadZipTable = async (req, res) => {
  const { tableName, doAnonymize = true } = req.body;

  const zippedTempFileName = await this.getAnonymizedTable(tableName, doAnonymize);
  return res.json({
    tableName,
    zippedTempFileName,  // STUB for the actual contents
  });
};

// exports.getAllTables = async () => {
//   try {
//     const result = await prisma.$queryRaw`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' order by "tablename";`;
//     console.log(result);
//   } catch (error) {
//     console.error(error);
//   }
// };

