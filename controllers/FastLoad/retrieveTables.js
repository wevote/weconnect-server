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
  let query = `DROP TABLE "${tempTableName}";`;
  try {
    try {
      await prisma.$queryRawUnsafe(query);
      console.log(`FastLoad: Table ${tempTableName} was dropped`);
    } catch (error) {
      console.log(`FastLoad: Table ${tempTableName} was not dropped since it did not exist (not a problem!)`);
    }
    query = `CREATE TEMP TABLE "${tempTableName}" AS TABLE "${tableName}";`;
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
const globalFirstNameSubstitutions = {};
const globalLastNameSubstitutions = {};
const globalEmailSubstitutions = {};
const globalFirstNamesUsed = [];  // so we don't get duplicate (but randomly selected) emailPersonal primary keys


const getTempTableAsJSON = async (tempTableName) => {
  console.log('FastLoad: getTempTableAsJSON: ', tempTableName);

  try {
    const orderBy = !['MeetingAttendee', 'QuestionAnswer', 'Task', 'TaskGroupTeamLink', 'TeamMember'].includes(tempTableName.replace('_temp', ''));
    let query = `SELECT * FROM "${tempTableName}"`;
    if (orderBy) {
      query += ' ORDER BY id';
    }
    // test stuff
    if (tempTableName.includes('TeamMember')) {
      const results =  await prisma.$queryRawUnsafe('SELECT * FROM "TeamMember"');
      console.log(`FastLoad: dumpDatabaseTableToTmp TeamMember dumped ${results.length} rows`);
    }

    console.log(`FastLoad: dumpDatabaseTableToTmp query: ${query}`);
    const results =  await prisma.$queryRawUnsafe(query);
    console.log(`FastLoad: dumpDatabaseTableToTmp ${tempTableName} dumped ${results.length} rows`);
    return results;
  } catch (error) {
    console.error('FastLoad: getTempTableAsJSON: ', error);
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

  /* eslint-disable no-await-in-loop */
  for (let id = 1; id <= maxId; id++) {
    // find them in the live table
    let person = await prisma.person.findUnique({ where: { id } });
    const junkReplacementPerson = { ...person };
    let dojunkReplacementPerson = false;

    // Many 'junky' or test rows have non-unique fields that lead to primary key insertion errors after anonymizing them
    // So do a super simple substitution for any rows that contain any of the junkDetectorTokens in names or email addresses
    // eslint-disable-next-line no-loop-func
    junkDetectorTokens.forEach((token) => {
      if ((person?.firstName || '').toLowerCase().includes(token)) {
        junkReplacementPerson.firstName = `Junk#${skipCounter++}`;
        dojunkReplacementPerson = true;
      }
      if (dojunkReplacementPerson || (person?.lastName || '').toLowerCase().includes(token)) {
        junkReplacementPerson.lastName = 'JunkReplacementLastName';
        dojunkReplacementPerson = true;
      }
      emailFields.forEach((field) => {
        if (((person && (person[field])) || '').toLowerCase().includes(token)) {
          dojunkReplacementPerson = true;
          junkReplacementPerson[field] = `${junkReplacementPerson.firstName}.${junkReplacementPerson.lastName}@nonsense.com`;
        }
      });
    });
    if (dojunkReplacementPerson === true) {
      console.log(`FastLoad: replacing junky fields person ${person.id} ${person?.firstName} ${person.lastName} ${person.emailPersonal} with ${junkReplacementPerson.emailPersonal}`);
      person = junkReplacementPerson;
    }

    if (person && (person?.emailPersonal  || '').length === 0) {
      person.emailPersonal = `${id}@nonsense.com`;
    }

    if (person && person?.emailPersonal) {
      // console.log('FastLoad: anonymizeTempTable', person);
      let sql = `UPDATE "${tempTableName}"
                 SET `;
      let newFirstName = '';
      if (globalFirstNameSubstitutions[person?.firstName]) {
        newFirstName = globalFirstNameSubstitutions[person.firstName];
      } else if (person?.firstName) {
        newFirstName = uniqueNamesGenerator({ dictionaries: [names]});
        if (globalFirstNamesUsed.includes(newFirstName)) {
          newFirstName += 'z';
        }
        globalFirstNamesUsed.push(newFirstName);
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
        if (['weasel', 'jackal', 'dog'].includes(newLastName)) {
          newLastName = uniqueNamesGenerator({ dictionaries: [animals]});
        }
        globalLastNameSubstitutions[person.lastName] = newLastName;
      }
      let newLastCapitalized = newLastName.slice(1);
      newLastCapitalized = newLastName.charAt(0).toUpperCase() + newLastName.slice(1); // Capitalize first letter and add the rest

      // eslint-disable-next-line no-loop-func
      lastNameFields.forEach((field) => {
        sql = `${sql}"${field}" = '${newLastCapitalized}', `;
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

      // console.log(sql);
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (error) {
        console.error('FastLoad: Row UPDATE error', JSON.stringify(error));
      }
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
  const make = await this.makeTempTable(tableName, tempTableName);
  console.log(`FastLoad: makeATempTableAndReturnJSON created temp table ${tempTableName} success = ${make}`);

  // Anonymize Person table, if it is 'Person' we don't want sensitive Data sent
  console.log(`FastLoad: makeATempTableAndReturnJSON tableName: ${tableName}, anonymizeSensitiveData: ${anonymizeSensitiveData}`);
  if (tableName === 'Person' && anonymizeSensitiveData) {
    await anonymizeTempTable(tempTableName);
  }

  return getTempTableAsJSON(tempTableName);
};

// See https://wevoteusa.atlassian.net/browse/WV-2669
exports.convertTeamDepartmentsToPostgresAcceptableFormat = async () => {
  console.log('App is converting old format Team department strings');

  const from = ['{Engineering}', '{Analytics}', '{"Donations"}'];
  const to = ['{"Engineering Team"}', '{"Analytics Team"}', '{"Donations Team"}'];
  for (let i = 0; i < from.length; i++) {
    const fromString = from[i];
    const toString = to[i];
    try {
      const query = `UPDATE public."Team" SET departments = '${toString}' WHERE departments = '${fromString}'`;
      const resp = await prisma.$executeRawUnsafe(query);
      console.log(`updatedDept (${fromString}): ${JSON.stringify(resp)}`);
    } catch (error) {
      console.log(`ERROR updatedDept: ${JSON.stringify(error)}`);
    }
  }
};

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
