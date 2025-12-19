const { PrismaClient } = require('@prisma/client');
const { uniqueNamesGenerator, animals, names } = require('unique-names-generator');
const { allowableTables } = require('./allowableTables');
const { doesPersonHaveIsAdmin } = require('../../models/personModel');


const prisma = new PrismaClient();

/**
 * Make a postgres temp table (kind of like a mysql memory table), that is only accessible by the
 * current session
 * The prisma ORM can't access that temp table, so we have to use SQL statements
 * https://www.postgresql.org/docs/current/sql-createtableas.html
 * @param tableName
 * @param tempTableName
 * @returns {Promise<boolean>}
 */
exports.makeTempTable = async (tableName, tempTableName) => {
  if (!tempTableName || tempTableName.length === 0) {
    // Prevent an attempt to drop a non-existent tempTableName
    console.log('makeTempTable: No temp table name provided');
    return false;
  }
  // This is a security measure to prevent dropping a table that is in the allowableTables list
  if (allowableTables.includes(tempTableName) || !tempTableName.includes('_temp')) {
    console.log(`makeTempTable: Table ${tempTableName} is required for the operation of weconnect. Not allowed to drop.`);
    return false;
  }
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

/**
 * Returns the maximum id of table to be fetched from the MASTER server
 * Runs on the Master server
 * @param tableName
 * @returns {Promise<number|*>} the number of rows
 */
exports.getMaxId = async (tableName) => {
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
    console.log(`rows count after ${tableName} --- ${rows}`);
  }
  return rows;
};

// These global tables will be used, if we need to anonymise more than just the Person table, so
// that the anonymised data will be consistent in the other tables.
const globalFirstNameSubstitutions = {};
const globalLastNameSubstitutions = {};
const globalEmailSubstitutions = {};


const getTempTableAsJSON = async (tempTableName) => {
  console.log('getTempTableAsJSON: ', tempTableName);

  try {
    const orderBy = !['MeetingAttendee', 'QuestionAnswer', 'Task', 'TaskGroupTeamLink', 'TeamMember'].includes(tempTableName.replace('_temp', ''));
    const query = `SELECT * FROM "${tempTableName}" ${orderBy ? 'ORDER BY id' : ''}`;
    console.log(`dumpDatabaseTableToTmp: ${query}`);
    return await prisma.$queryRawUnsafe(query);
  } catch (error) {
    console.error('getTempTableAsJSON: ', error);
    return undefined;
  }
};

/**
 * Does a series of sql operations against in memory the temp table (Person_temp for now) to anonymize the Persons/Staff
 * @param tempTableName
 * @returns {Promise<boolean>}
 */
const anonymizeTempTable = async (tempTableName) => {
  const colNames = [];
  const firstNameFields = [];
  const lastNameFields = [];
  const emailFields = [];
  console.log('anonymizeTempTable tempTableName: ', tempTableName);

  const maxId = await this.getMaxId(tempTableName);

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
      // console.log('anonymizeTempTable', person);
      let sql = `UPDATE "${tempTableName}"
                 SET `;
      let newFirstName = '';
      if (globalFirstNameSubstitutions[person?.firstName]) {
        newFirstName = globalFirstNameSubstitutions[person.firstName];
      } else if (person?.firstName) {
        newFirstName = uniqueNamesGenerator({ dictionaries: [names]});
        globalFirstNameSubstitutions[person.firstName] = newFirstName;
      }
      if (newFirstName) {
        firstNameFields.forEach((field) => {
          sql = `${sql} "${field}" = '${newFirstName}', `;
        });
      }

      let newLastName = '';
      if (globalLastNameSubstitutions[person?.lastName]) {
        newLastName = globalLastNameSubstitutions[person.lastName];
      } else if (person?.lastName) {
        newLastName = uniqueNamesGenerator({ dictionaries: [animals]});
        globalLastNameSubstitutions[person.lastName] = newLastName;
      }
      let newLastCapitalized = newLastName.slice(1);
      newLastCapitalized = newLastName.charAt(0).toUpperCase() + newLastName.slice(1); // Capitalize first letter and add the rest

      lastNameFields.forEach((field) => {
        sql = `${sql}"${field}" = '${newLastCapitalized}', `;
      });

      // linkedinUrl
      if (person.linkedInUrl && person.linkedInUrl.length) {
        const anon = `http://www.linkedin.com/in/${newFirstName}-${newLastName}`.toLowerCase();
        sql = `${sql}"linkedInUrl" = '${anon}', `;
      }

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
      sql = sql.replace('\n', '');
      sql += ` WHERE id = '${id}';`;
      // console.log(sql);
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (error) {
        console.error('Row UPDATE error', JSON.stringify(error));
      }
    } else {
      console.log(`No data for row ${id} in ${tempTableName}`);
    }
  }
  return true;
};

/**
 * Make the temp file, and get its output as JSON
 * @param tableName
 * @param anonymizeSensitiveData
 * @returns {Promise<string>}
 */
exports.makeATempTableAndReturnJSON = async (tableName, anonymizeSensitiveData) => {
  const tempTableName = `${tableName}_temp`;
  await this.makeTempTable(tableName, tempTableName);

  // Anonymize Person table, if it is 'Person' we don't want sensitive Data sent
  console.log(`makeATempTableAndReturnJSON tableName: ${tableName}, anonymizeSensitiveData: ${anonymizeSensitiveData}`);
  if (tableName === 'Person' && anonymizeSensitiveData) {
    return anonymizeTempTable(tempTableName);
  }

  return getTempTableAsJSON(tempTableName);
};

exports.getOneFastLoadTable = async (req, res) => {
  return res.json({});

  if (process.env.SERVER_IS_SOURCE_OF_TRUTH == true) {
    console.log('getOneFastLoadTable: weconnect-server environment variable SERVER_IS_SOURCE_OF_TRUTH is true, returning null');
    return null;
  }

  const { tableName, doNotAnonymize = false, email = '', password = '' } = req.body;
  const anonymize = !doNotAnonymize;
  const personIsAdmin = await doesPersonHaveIsAdmin(email, password);
  const anonymizeSensitiveData = anonymize && personIsAdmin;
  console.log(`getOneFastLoadTable email: ${email}, doNotAnonymize: ${doNotAnonymize}, anonymize: ${anonymize}, personIsAdmin: ${personIsAdmin}, anonymizeSensitiveData: ${anonymizeSensitiveData}`);

  const tableJSON = await this.makeATempTableAndReturnJSON(tableName, anonymizeSensitiveData);

  return res.json({
    tableName,
    tableJSON,
  });
};
