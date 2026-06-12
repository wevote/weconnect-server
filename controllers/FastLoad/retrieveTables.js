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
    console.log('FastLoad: makeTempTable: No temp table name provided');
    return false;
  }
  // This is a security measure to prevent dropping a table that is in the allowableTables list
  // with a second security measure that only allows dropping tables whose name ends with '_temp'
  if (allowableTables.includes(tempTableName) || !tempTableName.includes('_temp')) {
    console.log(`FastLoad: makeTempTable: Table ${tempTableName} is required for the operation of weconnect. Not allowed to drop.`);
    return false;
  }
  let query = `DROP TABLE IF EXISTS "${tempTableName}";`;
  try {
    try {
      await prisma.$queryRawUnsafe(query);
      console.log(`FastLoad: Table ${tempTableName} was dropped`);
    } catch (error) {
      console.log(`FastLoad: Table ${tempTableName} was not dropped, probably a problem!`);
    }
    query = `CREATE TEMP TABLE "${tempTableName}" AS TABLE "${tableName}";`;
    // console.log('makeTempTable query: ', query);
    await prisma.$queryRawUnsafe(query);
    return true;
  } catch (error) {
    console.error('FastLoad: makeTempTable', error);
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
      console.log(`FastLoad: getMaxId for table ${tableName}, "id" does not exist for tables with @@unique composite id and no data`);
    } else {
      console.error('FastLoad: ', error);
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
    console.log(`FastLoad: rows count after ${tableName} --- ${rows}`);
  }
  return rows;
};

// These global tables will be used, if we need to anonymise more than just the Person table, so
// that the anonymised data will be consistent in the other tables.
const globalSubstitutions = [];       // If we want to use these substiturions on the TeamMember table, this array might need to be persisted in a DB Table
const globalEmailSubstitutions = [];  // So we can replace emails consistently
const globalFirstNamesUsed = [];      // so we don't get duplicate (but randomly selected) emailPersonal primary keys

const getTempTableAsJSON = async (tempTableName) => {
  console.log('FastLoad: getTempTableAsJSON: ', tempTableName);

  try {
    const orderBy = !['MeetingAttendee', 'QuestionAnswer', 'Task', 'TaskGroupTeamLink', 'TeamMember'].includes(tempTableName.replace('_temp', ''));
    let query = `SELECT * FROM "${tempTableName}"`;
    if (orderBy) {
      query += ' ORDER BY id';
    }
    // test stuff
    // if (tempTableName.includes('QuestionnaireQuestion')) {
    //   const results =  await prisma.$queryRawUnsafe('SELECT * FROM "QuestionnaireQuestion"');
    //   console.log(`FastLoad: dumpDatabaseTableToTmp QuestionnaireQuestion dumped ${results.length} rows`);
    // }

    console.log(`FastLoad: dumpDatabaseTableToTmp query: ${query}`);
    const results =  await prisma.$queryRawUnsafe(query);
    console.log(`FastLoad: dumpDatabaseTableToTmp ${tempTableName} dumped ${results.length} rows`);
    return results;
  } catch (error) {
    console.error('FastLoad: getTempTableAsJSON: ', error);
    return undefined;
  }
};

const getUniqueFirstName = () => {
  let newFirstName = uniqueNamesGenerator({ dictionaries: [names]});
  while (globalFirstNamesUsed.includes(newFirstName)) {
    newFirstName += 'z';
  }
  globalFirstNamesUsed.push(newFirstName);
  return newFirstName;
};

const getSubstitution = (originalFirst, originalLast, originalPersonalEmail) => {
  if (globalSubstitutions.length) {
    const subEntry = globalSubstitutions.find((sub) => sub.originalPersonalEmail === originalPersonalEmail);
    if (subEntry) {
      return subEntry;
    }
  }
  const last =  uniqueNamesGenerator({ dictionaries: [animals]});
  const lastName  = last.charAt(0).toUpperCase() + last.slice(1); // Capitalize first letter and add the rest
  const newEntry = {
    originalFirst,
    originalLast,
    originalPersonalEmail,
    firstName: getUniqueFirstName(),
    lastName,
  };

  globalSubstitutions.push(newEntry);
  return newEntry;
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
  console.log('FastLoad: anonymizeTempTable tempTableName: ', tempTableName);

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
    // console.log('FastLoad: getAnonymizedTable select column_name', colNames);
  } catch (error) {
    console.error('FastLoad: ', error);
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

  const junkDetectorTokens = ['deprecate', 'do-not-reply', 'donotreply', 'delete'];
  let skipCounter = 0;
  const emailRegex = /[-\s&#=_'+,<>()/]/gm;
  // Loop through the rows
  /* eslint-disable no-await-in-loop */
  for (let id = 1; id <= maxId; id++) {
    // find them in the live table
    let person = await prisma.person.findUnique({ where: { id } });
    const replacementPersonForJunkData = { ...person };
    let handlePersonWithJunkData = false;

    // Many "test" Person rows have non-unique fields that lead to primary key insertion errors after anonymizing them
    // So do a super simple temporary substitution for any rows that contain any of the junkDetectorTokens in names or email addresses
    // eslint-disable-next-line no-loop-func
    junkDetectorTokens.forEach((token) => {
      if ((person?.firstName || '').toLowerCase().includes(token)) {
        replacementPersonForJunkData.firstName = `Junk${skipCounter++}`;
        handlePersonWithJunkData = true;
      }
      if (handlePersonWithJunkData || (person?.lastName || '').toLowerCase().includes(token)) {
        replacementPersonForJunkData.lastName = 'JunkReplacementLastName';
        handlePersonWithJunkData = true;
      }

      emailFields.forEach((field) => {
        if (((person && (person[field])) || '').toLowerCase().includes(token)) {
          handlePersonWithJunkData = true;
          const first = (replacementPersonForJunkData.firstName).replace(emailRegex, '');
          const last = (replacementPersonForJunkData.lastName).replace(emailRegex, '');
          replacementPersonForJunkData[field] = `${first}.${last}@nonsense.com`;
        }
      });
    });
    if (handlePersonWithJunkData === true) {
      console.log(`FastLoad: replacing junky fields person: ${person.id}, first: ${person?.firstName}, last: ${person.lastName}, personal: ${person.emailPersonal} with: ${replacementPersonForJunkData.emailPersonal}`);
      person = replacementPersonForJunkData;
    }

    if (person && (person.emailPersonal  || '').length === 0) {
      person.emailPersonal = `${id}@nonsense.com`;
    }

    if (person && person.emailPersonal) {
      // console.log('FastLoad: anonymizeTempTable', person);
      let sql = `UPDATE "${tempTableName}"
                 SET `;
      const personFirst = (person.firstName).length ? person.firstName : (person.id).toString();
      const personLast = (person.lastName).length ? person.lastName : (person.id).toString();
      const { firstName: newFirstName, lastName: newLastName } = getSubstitution(personFirst, personLast, person.emailPersonal);

      firstNameFields.forEach((field) => {
        sql = `${sql} "${field}" = '${newFirstName}', `;
      });

      // eslint-disable-next-line no-loop-func
      lastNameFields.forEach((field) => {
        sql = `${sql}"${field}" = '${newLastName}', `;
      });

      // linkedinUrl
      if (person.linkedInUrl && person.linkedInUrl.length) {
        const anon = `http://www.linkedin.com/in/${newFirstName}-${newLastName}`.toLowerCase();
        sql = `${sql}"linkedInUrl" = '${anon}', `;
      }

      // eslint-disable-next-line no-loop-func
      emailFields.forEach((field) => {
        let newEmail = '';
        if (person[field]) {
          if (globalEmailSubstitutions[person[field]]) {
            newEmail = globalEmailSubstitutions[person[field]];
          } else {
            const email = person[field];
            const index = email.indexOf('@');
            if (index < 2) {
              // console.log(`FastLoad: email problem for ${field} with value ${email}, skipping field`);
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
      sql += `, "phoneNumber" = '14155551212', "birthdayMonthAndDay" = 'April 1' WHERE id = '${id}';`;

      try {
        const resp = await prisma.$executeRawUnsafe('SELECT table_name FROM information_schema.tables where table_name = \'Person_temp\'');
        console.log('FastLoad: Check for Person_temp: ', resp);
      } catch (error) {
        console.error('FastLoad: Check for Person_temp error', JSON.stringify(error));
      }

      // console.log(sql);
      try {
        await prisma.$executeRawUnsafe(sql);
        // console.log('FastLoad: Row UPDATE successful', sql);
      } catch (error) {
        console.error('FastLoad: Row UPDATE error', JSON.stringify(error), sql);    // add sql
      }
    }
  }
  // console.log(JSON.stringify(globalSubstitutions));
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
  const make = await this.makeTempTable(tableName, tempTableName);
  console.log(`FastLoad: makeATempTableAndReturnJSON created temp table ${tempTableName} success = ${make}`);

  // Anonymize Person table, if it is 'Person' we don't want sensitive Data sent
  console.log(`FastLoad: makeATempTableAndReturnJSON tableName: ${tableName}, anonymizeSensitiveData: ${anonymizeSensitiveData}`);
  if (tableName === 'Person' && anonymizeSensitiveData) {
    await anonymizeTempTable(tempTableName);
  }

  return getTempTableAsJSON(tempTableName);
};

exports.getPostgresTableStatistics = async (req, res) => {
  const sqlTables = [];
  try {
    const sql = 'SELECT schemaname, relname AS table_name, n_live_tup AS estimated_row_count ' +
      'FROM pg_stat_user_tables ' +
      'ORDER BY n_live_tup DESC;';
    const results = await prisma.$queryRawUnsafe(sql);
    // eslint-disable-next-line guard-for-in,no-restricted-syntax
    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      if (!['session', '_prisma_migrations', 'User'].includes(row.table_name)) {
        sqlTables.push([
          row.table_name,
          parseInt(row.estimated_row_count),
        ]);
      }
    }
    console.log('FastLoad: getPostgresTableStatistics', sqlTables);
  } catch (error) {
    console.error('FastLoad: getPostgresTableStatistics error', JSON.stringify(error));
  }

  return res.json({
    sqlTables: JSON.stringify(sqlTables),
  });
};

/*
April 22, possible new way
psql -U stevepodell -d WeConnectDB < steveWeconnectBackupPlainApr22
Old way
pg_restore --no-owner --no-privileges -d WeConnectDB steveLiveCustomApr20
 */



exports.getOneFastLoadTable = async (req, res) => {
  // This function gets a table's content and sends it to the client, so it HAS TO be able to be run on the production server
  const isOnSourceOfTruthServer = (process.env.SERVER_IS_SOURCE_OF_TRUTH === true) || (process.env.SERVER_IS_SOURCE_OF_TRUTH === 'true');
  const { host }  = req;
  const isOnWeVoteMasterURL = host.toLowerCase().includes('wevote.org') || host.toLowerCase().includes('wevote.us');
  if (!isOnWeVoteMasterURL && !isOnSourceOfTruthServer) {
    console.log('getOneFastLoadTable: On client site since weconnect-server environment variable SERVER_IS_SOURCE_OF_TRUTH is false, returning null');
    return null;
  }

  const { tableName, email = '', password = '' } = req.body;
  const personIsAdmin = email.length ? await doesPersonHaveIsAdmin(email, password) : false;
  const anonymizeSensitiveData = !personIsAdmin;
  console.log(`FastLoad: getOneFastLoadTable tableName: '${tableName}' email: '${email}', personIsAdmin: ${personIsAdmin}, anonymize: ${anonymizeSensitiveData}`);
  const tableJSON = await this.makeATempTableAndReturnJSON(tableName, anonymizeSensitiveData);

  return res.json({
    tableName,
    tableJSON,
    anonymizeSensitiveData,
  });
};
