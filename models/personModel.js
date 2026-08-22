// weconnect-server/models/personModel.js, parallel to /prisma/schema/person.prisma
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('@node-rs/bcrypt');
const validator = require('validator');
const { exec } = require('child_process');

const prisma = new PrismaClient();

const PERSON_AWAY_FIELDS_ACCEPTED = {
  awayDescription: 'STRING',
  awayDescriptionForTeamLeads: 'STRING',
  dateEndDate: 'DATE',
  dateEndDateEstimated: 'DATE',
  dateStartDate: 'DATE',
  dateSubmitted: 'DATE',
  personId: 'INTEGER',
  reportedByPersonId: 'INTEGER',
  isLeaveOfAbsence: 'BOOLEAN',
  isNotFeelingWell: 'BOOLEAN',
  isNonResponsive: 'BOOLEAN',
  isNotAttending: 'BOOLEAN',
  isResigned: 'BOOLEAN',
  isVacation: 'BOOLEAN',
  isWorkTrip: 'BOOLEAN',
};

const PERSON_FIELDS_ACCEPTED = {
  emailOfficialAlternate: 'STRING',
  emailPersonal: 'STRING',
  emailPersonalAlternate: 'STRING',
  emailPreferred: 'STRING',
  firstName: 'STRING',
  firstNamePreferred: 'STRING',
  lastName: 'STRING',
  linkedInUrl: 'STRING',
  location: 'STRING',
  password: 'STRING',
  stateCode: 'STRING',
  zipCode: 'STRING',
};

const PERSON_FIELDS_ACCEPTED_FROM_QUESTIONNAIRE = {
  ...PERSON_FIELDS_ACCEPTED,
  birthdayMonthAndDay: 'STRING',
  dateEndDate: 'DATE',
  dateStartDate: 'DATE',
  emailOfficial: 'STRING',
  hoursPerWeekEstimate: 'INTEGER',
  jobTitle: 'STRING',
};

const PERSON_FIELDS_ACCEPTED_ADMIN = {
  ...PERSON_FIELDS_ACCEPTED_FROM_QUESTIONNAIRE,
  emailOfficialVerified: 'BOOLEAN',
  isAdmin: 'BOOLEAN',
  isHRAdmin: 'BOOLEAN',
  isHROfferAdmin: 'BOOLEAN',
  isHRGeneralist1: 'BOOLEAN',
  isHRGeneralist2: 'BOOLEAN',
  isHiringManager: 'BOOLEAN',
  isIntern: 'BOOLEAN',
  isMonthlyDonor: 'BOOLEAN',
  isTeamLead: 'BOOLEAN',
  jazzHrUrl: 'STRING',
  jobTitle: 'STRING',
  phoneNumber: 'STRING',
  statusActive: 'BOOLEAN',
  statusAvailableForSpecialProjects: 'BOOLEAN',
  statusEmailCreated: 'BOOLEAN',
  statusOfferApproved: 'BOOLEAN',
  statusOfferDecisionNeeded: 'BOOLEAN',
  statusOfferLetterCreated: 'BOOLEAN',
  statusOfferLetterSigned: 'BOOLEAN',
  statusOfferQuestionnaireAnswered: 'BOOLEAN',
  statusOfferQuestionnaireSent: 'BOOLEAN',
  statusOfferWillNotBeMade: 'BOOLEAN',
  statusOnLeave: 'BOOLEAN',
  statusResigned: 'BOOLEAN',
};

const ACCESS_RIGHTS_OPTIONS = [ // Used by viewerAccessRights in weconnect-client
  'canAddPerson', 'canAddPersonDataAnyone', 'canAddTeam',
  'canAddTeamMemberAnyTeam', 'canCreateOrgEmailAccount', 'canDoAnythingIsAdmin',
  'canEditPermissionsAnyone', 'canEditPersonAnyone',
  'canEditTeamAnyTeam',
  'canMarkAnyVolunteerTaskCompleted', 'canMarkOnboardingTaskCompleted', 'canMarkOnboardingTasksInBulk',
  'canRemoveTeam', 'canRemoveTeamMemberAnyTeam',
  'canSendOfferLetter', 'canSendOfferQuestionnaire',
  'canViewSystemSettings', 'canViewTeamMembersAnyTeam',
];

// superusers allow access to grant admin rights, in a blank DB, or after a misconfiguration.
const SITE_SUPER_USERS = ['dale.mcgrew@wevote.us', 'steve.podell@wevote.us']; // Meant for jump-starting site.

const getAccessRightsForPerson = (person) => {
  const accessRightsDict = {};
  if (!person || !person.id) {
    console.error('Undefined person in getAccessRightsForPerson');
    return accessRightsDict;
  }
  // Add all ACCESS_RIGHTS_OPTIONS to the accessRightsDict with false values
  for (let i = 0; i < ACCESS_RIGHTS_OPTIONS.length; i++) {
    accessRightsDict[ACCESS_RIGHTS_OPTIONS[i]] = false;
  }
  // If person is an admin, set all access rights to true
  if (person.isAdmin) {
    for (let i = 0; i < ACCESS_RIGHTS_OPTIONS.length; i++) {
      accessRightsDict[ACCESS_RIGHTS_OPTIONS[i]] = true;
    }
  } else {
    if (person.isHRAdmin) {
      accessRightsDict.canAddPerson = true;
      accessRightsDict.canAddPersonDataAnyone = true;
      accessRightsDict.canAddTeamMemberAnyTeam = true;
      accessRightsDict.canEditPersonAnyone = true;
      accessRightsDict.canMarkAnyVolunteerTaskCompleted = true;
      accessRightsDict.canMarkOnboardingTaskCompleted = true;
      accessRightsDict.canRemoveTeamMemberAnyTeam = true;
      accessRightsDict.canSendOfferLetter = true;
      accessRightsDict.canViewSystemSettings = true;
      accessRightsDict.canViewTeamMembersAnyTeam = true;
    } else if (person.isHRGeneralist2) {
      accessRightsDict.canAddPerson = true;
      accessRightsDict.canAddPersonDataAnyone = true;
      accessRightsDict.canAddTeamMemberAnyTeam = true;
      accessRightsDict.canEditPersonAnyone = true;
      accessRightsDict.canEditTeamAnyTeam = true;
      accessRightsDict.canMarkOnboardingTaskCompleted = true;
      // accessRightsDict.canRemoveTeamMemberAnyTeam = true;
      accessRightsDict.canViewSystemSettings = true;
      accessRightsDict.canViewTeamMembersAnyTeam = true;
    } else if (person.isHRGeneralist1) {
      accessRightsDict.canAddPerson = true;
      accessRightsDict.canAddPersonDataAnyone = true;
      accessRightsDict.canAddTeamMemberAnyTeam = true;
      accessRightsDict.canViewSystemSettings = true;
    }
    if (person.isHROfferAdmin) {
      accessRightsDict.canSendOfferLetter = true;
    }
    if (person.isHiringManager) {
      accessRightsDict.canAddPerson = true;
      accessRightsDict.canAddPersonDataAnyone = true;
    }
  }
  return accessRightsDict;
};

function removeProtectedFieldsFromPerson (person) {
  const modifiedPerson = { ...person };
  delete modifiedPerson.emailVerificationToken;
  delete modifiedPerson.password;
  delete modifiedPerson.passwordResetExpires;
  delete modifiedPerson.passwordResetToken;
  return modifiedPerson;
}

function removeProtectedFieldsFromPersonAway (personAway) {
  const modifiedPersonAway = { ...personAway };
  return modifiedPersonAway;
}

async function findPersonById (id, includeAllData = false) {
  if (!id) {    // If the person has not been stored yet, during person creation
    return {
      id: 0,
      personId: 0,
      status: 'FIND_PERSON_BY_ID_NO_ID_PROVIDED ',
    };
  }
  const person = await prisma.person.findUnique({
    where: {
      id,
    },
  });
  if (!person) {    // If the person has not been stored yet, during person creation
    return {
      id: 0,
      personId: 0,
      status: 'FIND_PERSON_BY_ID_NO_PERSON_FOUND ',
    };
  }
  let modifiedPerson;
  if (includeAllData) {
    modifiedPerson = person;
  } else {
    modifiedPerson = removeProtectedFieldsFromPerson(person);
  }
  modifiedPerson.personId = person.id;
  return modifiedPerson;
}

function extractPersonVariablesToChange (queryParams) {
  let keyWithoutToBeSaved = '';
  const updateDict = {};
  Object.entries(queryParams).forEach(([key, value]) => {
    // console.log('==== key:', key, ', value:', value);
    keyWithoutToBeSaved = key.replace('ToBeSaved', '');
    if (PERSON_FIELDS_ACCEPTED_FROM_QUESTIONNAIRE.includes(keyWithoutToBeSaved) && value) {
      if (queryParams && queryParams.get(`${keyWithoutToBeSaved}Changed`) === 'true') {
        updateDict[keyWithoutToBeSaved] = value;
      }
    }
  });
  return updateDict;
}

async function findPersonListByIdList (idList, includeAllData = false) {
  const personList = await prisma.person.findMany({
    where: {
      id: { in: idList },
    },
  });
  // console.log('findPersonListByIdList personList:', personList);
  let modifiedPerson = {};
  let modifiedPersonList = [];
  if (includeAllData) {
    modifiedPersonList = personList;
  } else {
    personList.forEach((person) => {
      modifiedPerson = removeProtectedFieldsFromPerson(person);
      modifiedPerson.personId = person.id;
      modifiedPersonList.push(modifiedPerson);
    });
  }
  // console.log('findPersonListByIdList modifiedPersonList:', modifiedPersonList);
  return modifiedPersonList;
}

async function findPersonListByParams (params = {}, includeAllData = false) {
  // Recursively make only email fields case-insensitive
  const makeEmailsInsensitive = (obj) => {
    if (Array.isArray(obj)) return obj.map(makeEmailsInsensitive);
    if (obj && typeof obj === 'object') {
      return Object.fromEntries(Object.entries(obj).map(([key, value]) => {
        // Only modify if key contains 'email' AND value is a string
        if (typeof value === 'string' && key.toLowerCase().includes('email')) {
          return [key, { equals: value, mode: 'insensitive' }];
        }
        return [key, makeEmailsInsensitive(value)];
      }));
    }
    return obj;
  };

  // Only modify params if it contains an email field
  const hasEmailField = JSON.stringify(params).toLowerCase().includes('email');
  const finalParams = hasEmailField ? makeEmailsInsensitive(params) : params;

  const personList = await prisma.person.findMany({
    where: finalParams,
  });
  let modifiedPerson = {};
  let modifiedPersonList = [];
  if (includeAllData) {
    modifiedPersonList = personList;
  } else {
    personList.forEach((person) => {
      modifiedPerson = removeProtectedFieldsFromPerson(person);
      modifiedPerson.personId = person.id;
      modifiedPersonList.push(modifiedPerson);
    });
  }
  // console.log('findPersonListByParams modifiedPersonList:', modifiedPersonList);
  return modifiedPersonList;
}

async function findOnePerson (params, includeAllData = false) {   // Find one with array
  let person;
  if (Object.hasOwn(params, 'emailPersonal') && Object.keys(params).length === 1) {
    // Special case for a password that has been saved with capital letters like Tommy@gmail.com
    person = await prisma.person.findFirst({
      where: {
        emailPersonal: {
          equals: params.emailPersonal,
          mode: 'insensitive',           // This makes the lookup case-insensitive
        },
      },
    });
  } else {
    person = await prisma.person.findUnique({
      where: params,
    });
  }

  let modifiedPerson;
  if (includeAllData) {
    modifiedPerson = person;
  } else {
    modifiedPerson = removeProtectedFieldsFromPerson(person);
  }
  if (person) {    // allows us to check for the existence of a person, allows a null return
    modifiedPerson.personId = person.id;
  }
  return modifiedPerson;
}

async function deletePersonDataFromOtherTables (id) {
  await prisma.clientSession.deleteMany({
    where: {
      personId: {
        equals: id,
      },
    },
  });

  await prisma.meetingAttendee.deleteMany({
    where: {
      personId: {
        equals: id,
      },
    },
  });
  await prisma.task.deleteMany({
    where: {
      doneByPersonId: {
        equals: id,
      },
    },
  });
  await prisma.taskChangeLog.deleteMany({
    where: {
      doneByPersonId: {
        equals: id,
      },
    },
  });
  await prisma.teamMember.deleteMany({
    where: {
      personId: {
        equals: id,
      },
    },
  });
}

async function deleteOne (id) {
  await prisma.person.delete({
    where: {
      id,
    },
  });
}

// eslint-disable-next-line no-unused-vars
// const setStatusFieldsIfNotInitialized = (person) => {
//   /* eslint-disable no-param-reassign */
//   if (person.isAdmin === null) person.isAdmin = false;
//   if (person.isHiringManager === null) person.isHiringManager = false;
//   if (person.isIntern === null) person.isIntern = false;
//   if (person.isTeamLead === null) person.isTeamLead = false;
//   if (person.statusEmailCreated === null) person.statusEmailCreated = false;
//   if (person.statusActive === null) person.statusActive = false;
//   if (person.statusOfferDecisionNeeded === null) person.statusOfferDecisionNeeded = true;
//   if (person.statusOfferLetterCreated === null) person.statusOfferLetterCreated = false;
//   if (person.statusOfferLetterSigned === null) person.statusOfferLetterSigned = false;
//   if (person.statusOnLeave === null) person.statusOnLeave = false;
//   if (person.statusResigned === null) person.statusResigned = false;
//   if (person.statusNonresponsive === null) person.statusNonresponsive = false;
//   if (person.statusOfferApproved === null) person.statusOfferApproved = false;
//   if (person.statusOfferWillNotBeMade === null) person.statusOfferWillNotBeMade = false;
//   if (person.isHRAdmin === null) person.isHRAdmin = false;
//   if (person.isHRGeneralist1 === null) person.isHRGeneralist1 = false;
//   if (person.isHRGeneralist2 === null) person.isHRGeneralist2 = false;
//   if (person.isHROfferAdmin === null) person.isHROfferAdmin = false;
//   if (person.statusAvailableForSpecialProjects === null) person.statusAvailableForSpecialProjects = false;
//   /* eslint-enable no-param-reassign */
//   return person;
// };

async function savePerson (incomingPersonChangeDict) {
  // 2025-04-30 This use of setStatusFieldsIfNotInitialized here can be destructive because
  //  incomingPersonChangeDict may not have all of the person data from the database in it.
  // TODO: setStatusFieldsIfNotInitialized should be called in another place.
  // setStatusFieldsIfNotInitialized(incomingPerson);
  // console.log('savePerson incomingPersonChangeDict BEFORE:', incomingPersonChangeDict?.id, incomingPersonChangeDict);
  const updatedPerson = await prisma.person.update({
    where: {
      id: incomingPersonChangeDict.id,
    },
    data: incomingPersonChangeDict,
  });
  // console.log('savePerson AFTER:', updatedPerson);
  return updatedPerson;
}

async function savePersonAway (personAway) {
  // console.log('savePersonAway personAway:', personAway);
  const updatePersonAway = await prisma.personAway.update({
    where: {
      id: personAway.id,
    },
    data: personAway,
  });
  // console.log(updatePersonAway);
  return updatePersonAway;
}

async function updatePersonByPersonId (personId, person) {
  const updatePerson = await prisma.person.update({
    where: {
      personId,
    },
    data: person,
  });
  // console.log(updatePerson);
  return updatePerson;
}

function isoFutureDateDays (days) {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + days);
  return futureDate;
}

// For required fields that we want to include, even if not passed from the interface.
/*
const personObjTemplate = {
  // birthdayMonthAndDay: '',
  // emailOfficial: '',
  // emailOfficialAlternate: '',
  // emailPersonal: '',
  // emailPersonalAlternate: '',
  // emailPreferred: '',
  firstName: '',
  // firstNamePreferred: '',
  // gender: '',
  // hoursPerWeekEstimate: 0,
  // hoursVolunteered: 0,
  // howLongAtOrg: 0,
  // jobTitle: '',
  lastName: '',
  // location: '',
  // staffKind: '',
  // stateCode: '',
  // uploadedImageUrlLarge: '',
  // uploadedImageUrlSmall: '',
  // zipCode: '',

  password: '',
  passwordResetToken: '',
  passwordResetExpires: isoFutureDateDays(365),
  emailVerificationToken: '',
  emailVerified: false,

  // bluesky: '',
  // facebookUrl: '',
  // githubUrl: '',
  // jazzHrUrl: '',
  // linkedInUrl: '',
  // portfolioUrl: '',
  // snapchat: '',
  // tokens: {},
  // twitch: '',
  // twitterHandle: '',
  // websiteUrl: '',
};
*/
async function createPerson (updateDict) {
  // eslint-disable-next-line prefer-object-spread
  const person = await prisma.person.create({ data: updateDict });
  return person;
}

async function createPersonAway (updateDict) {
  const personAway = await prisma.personAway.create({ data: updateDict });
  return personAway;
}

async function comparePassword (person, candidatePassword, cb) {
  try {
    const verified = await bcrypt.compare(candidatePassword, person.password);
    cb(null, verified, person.password);
  } catch (err) {
    cb(err);
  }
}

/**
 * Verify that emailOfficial or emailPreferred will be unique if inserted into the db,
 * emailPersonal is guaranteed unique by SQL constraints
 * @param email
 * @returns {Promise<boolean>}
 */
const manuallyConfirmEmailUniqueness = async (email) => {
  if (!email) {
    return true;
  }
  const key = Object.keys(email)[0];
  const value = email[key];
  if (!value) {
    return true;
  } else if (value.length === 0) {
    return true;
  }
  // eslint-disable-next-line no-param-reassign
  email[key] = validator.normalizeEmail(value, { gmail_remove_dots: false });
  const personList = await findPersonListByParams(email, true);
  // console.log('manuallyConfirmEmailUniqueness found a match for ', email);
  if (personList.length > 0) {
    if (personList.length > 1) {
      console.error(`manuallyConfirmEmailUniqueness found more than one matching '${email.key}' rows, this is a data corruption error`);
    }
    return false;
  }
  return true;    // email will be unique if inserted in db
};

/**
 * Allow users to login with emailOfficial or emailPreferred in addition to with emailPersonal (the unique key)
 * @param emailSubmitted
 * @param returnFullPerson
 * @returns {Promise<*>}
 */
const getUniqueKeyEmail = async (emailSubmitted, returnFullPerson = false) => {
  const emailSubmittedCleaned = validator.normalizeEmail(emailSubmitted, { gmail_remove_dots: false });
  let person = await findOnePerson({ emailPersonal: emailSubmittedCleaned });
  if (Object.keys(person).length === 0) {
    let personList = await findPersonListByParams({ emailOfficial: emailSubmittedCleaned }, true);
    if (personList.length === 1) {
      [person] = personList;
      if (personList.length > 1) {
        console.error(`getUniqueKeyEmail found more than one matching emailOfficial '${emailSubmittedCleaned}' rows, this is a data corruption error`);
      }
    } else if (Object.keys(person).length === 0) {
      personList = await findPersonListByParams({ emailPreferred: emailSubmittedCleaned }, true);
      if (personList.length === 1) {
        [person] = personList;
      }
      if (personList.length > 1) {
        console.error(`getUniqueKeyEmail found more than one matching emailPreferred '${emailSubmittedCleaned}' rows, this is a data corruption error`);
      }
    }
  }
  if (Object.keys(person).length > 1) {
    if (returnFullPerson) {
      return person;
    } else {
      return person.emailPersonal;
    }
  }
  // They sent in an invalid email, so fall through
  return emailSubmittedCleaned;
};

/**
 * For fast load: Would this person have isAdmin privileges?
 * @param email
 * @param password
 * @returns {Promise<*>}
 */
const doesPersonHaveIsAdmin = async (email, password) => {
  const emailSubmittedCleaned = validator.normalizeEmail(email, { gmail_remove_dots: false });
  let person = await findOnePerson({ emailPersonal: emailSubmittedCleaned }, true);

  let isAdmin = false;

  if (person && Object.keys(person).length > 0) {
    isAdmin = person.isAdmin;
  } else {
    const personList = await findPersonListByParams({ emailOfficial: emailSubmittedCleaned }, true);
    if (personList && personList.length === 1) {
      [person] = personList;
      isAdmin = person.isAdmin;
    } else if (personList && personList.length > 1) {
      console.error(`doesPersonHaveIsAdmin found more than one matching emailOfficial '${emailSubmittedCleaned}' rows, this is a data corruption error`);
      isAdmin = false;
    }
  }

  if (!isAdmin || !person || Object.keys(person).length === 0) {
    return isAdmin;
  }

  const verified = await bcrypt.compare(password, person.password);
  return verified;
};

const updatePersonWhoAreNotActiveDonors = async (donorsArray) => {
  let personsRemovedAsDonors = {};

  if (!donorsArray || !donorsArray.length) {
    console.log('updatePersonWhoAreNotActiveDonors donorsArray length is 0');
  } else {
    personsRemovedAsDonors = await prisma.person.findMany({
      where: {
        isMonthlyDonor: true,
        NOT: {
          id: {
            in: donorsArray,
          },
        }, // Condition: id is not in the list of people we just marked
      },
    });

    // const ret =
    await prisma.person.updateMany({
      where: {
        isMonthlyDonor: true,
        NOT: {
          id: {
            in: donorsArray,
          },
        }, // Condition: id is not in the list of people we just marked
      },
      data: {
        isMonthlyDonor: false, // Set new value
      },
    });
    // console.log('updatePersonWhoAreNotActiveDonors: ', ret);
  }
  return personsRemovedAsDonors;
};

/**
 * Create a single change log entry which contains a person (personId), an actor performing change (changeId), and
 * change description (changeDescription)
 */
const createProfileChangeLogEntry = async ({ personId, changedById, changeDescription, teamName }) => {
  try {
    return await prisma.profileChangeLog.create({
      data: {
        personId: parseInt(personId),
        changedById: parseInt(changedById),
        changeDescription,
        teamName,
        // dateCreated defaults to now() in Prisma schema
      },
    });
  } catch (error) {
    console.error('Error in createProfileChangeLogEntry:', error);
    throw error;
  }
};

/**
 * Retrieve profile change log rows where the person is either the subject or the actor
 */
const retrieveProfileChangeLogsFromDb = async (personId) => {
  try {
    const id = parseInt(personId);
    const logs = await prisma.profileChangeLog.findMany({
      where: {
        OR: [{ personId: id }, { changedById: id }],
      },
      orderBy: { dateCreated: 'desc' },
    });

    // get unique IDs to fetch names
    const uniquePersonIds = [...new Set([
      ...logs.map((l) => l.personId),
      ...logs.map((l) => l.changedById),
    ])];

    // fetch names from Person table
    const people = await prisma.person.findMany({
      where: { id: { in: uniquePersonIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    // create map for quick lookup
    const peopleMap = people.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

    // attach map to logs and return
    return logs.map((log) => ({
      ...log,
      person: peopleMap[log.personId] || { firstName: 'Unknown', lastName: '' },
      changer: peopleMap[log.changedById] || { firstName: 'System', lastName: '' },
    }));
  } catch (error) {
    console.error('Error in retrieveProfileChangeLogsFromDb:', error);
    throw error;
  }
};

/**
 * Create multiple log entries at once
 * @param {Array} logRows - Array of objects { personId, changedById, changeDescription }
 */
const createProfileChangeLogEntriesBulk = async (logRows) => {
  try {
    return await prisma.profileChangeLog.createMany({
      data: logRows.map((row) => ({
        personId: parseInt(row.personId),
        changedById: parseInt(row.changedById),
        changeDescription: row.changeDescription,
        teamName: row.teamName || null,
      })),
    });
  } catch (error) {
    console.error('Error in createProfileChangeLogEntriesBulk:', error);
    throw error;
  }
};

const createDevPersonIfTheyDontExist = async () => {
  const { DEV_PERSON_INITIAL_USER, SERVER_IS_SOURCE_OF_TRUTH } = process.env;
  if (SERVER_IS_SOURCE_OF_TRUTH === 'true') {
    // Do not run this in production
    return;
  }

  try {
    if (DEV_PERSON_INITIAL_USER && DEV_PERSON_INITIAL_USER.length > 0) {
      const person = await findOnePerson({ emailPersonal: DEV_PERSON_INITIAL_USER.split(' ')[2] });
      if (Object.keys(person).length === 0) {
        exec(`node ./node_scripts/createDevUser ${DEV_PERSON_INITIAL_USER}`);  // Force the exercising of the script, instead of copying code
        console.log(`createDevPersonIfTheyDontExist: ${DEV_PERSON_INITIAL_USER} created`);
      } else {
        console.log(`createDevPersonIfTheyDontExist: ${DEV_PERSON_INITIAL_USER} already exists`);
      }
    }
  } catch (error) {
    console.log('createDevPersonIfTheyDontExist error:', error);
  }
};

module.exports = {
  comparePassword,
  createDevPersonIfTheyDontExist,
  createPerson,
  createPersonAway,
  deleteOne,
  deletePersonDataFromOtherTables,
  doesPersonHaveIsAdmin,
  extractPersonVariablesToChange,
  findOnePerson,
  findPersonById,
  findPersonListByIdList,
  findPersonListByParams,
  getAccessRightsForPerson,
  getUniqueKeyEmail,
  isoFutureDateDays,
  manuallyConfirmEmailUniqueness,
  PERSON_AWAY_FIELDS_ACCEPTED,
  PERSON_FIELDS_ACCEPTED,
  PERSON_FIELDS_ACCEPTED_ADMIN,
  PERSON_FIELDS_ACCEPTED_FROM_QUESTIONNAIRE,
  removeProtectedFieldsFromPerson,
  removeProtectedFieldsFromPersonAway,
  savePerson,
  savePersonAway,
  SITE_SUPER_USERS,
  updatePersonByPersonId,
  updatePersonWhoAreNotActiveDonors,
  createProfileChangeLogEntry,
  retrieveProfileChangeLogsFromDb,
  createProfileChangeLogEntriesBulk,
}; // Export the functions
