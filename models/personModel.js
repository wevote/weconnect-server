// weconnect-server/models/personModel.js, parallel to /prisma/schema/person.prisma

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('@node-rs/bcrypt');

const prisma = new PrismaClient();

const PERSON_FIELDS_ACCEPTED = [
  'firstName',
  'firstNamePreferred',
  'emailPersonal',
  'hoursPerWeekEstimate',
  'jobTitle',
  'lastName',
  'location',
  'stateCode',
  'zipCode',
];

function removeProtectedFieldsFromPerson (person) {
  const modifiedPerson = { ...person };
  delete modifiedPerson.emailVerificationToken;
  delete modifiedPerson.password;
  delete modifiedPerson.passwordResetExpires;
  delete modifiedPerson.passwordResetToken;
  return modifiedPerson;
}

async function findPersonById (id, includeAllData = false) {
  const person = await prisma.person.findUnique({
    where: {
      id,
    },
  });
  let modifiedPerson = {};
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
    if (PERSON_FIELDS_ACCEPTED.includes(keyWithoutToBeSaved) && value) {
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
  const personList = await prisma.person.findMany({
    where: params,
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
  return modifiedPersonList;
}

async function findOnePerson (params, includeAllData = false) {   // Find one with array
  const person = await prisma.person.findUnique({
    where: params,
  });
  let modifiedPerson = {};
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

async function deleteOne (id) {
  await prisma.person.delete({
    where: {
      id,
    },
  });
}

async function savePerson (person) {
  // console.log('savePerson person:', person);
  const updatePerson = await prisma.person.update({
    where: {
      id: person.id,
    },
    data: person,
  });
  // console.log(updatePerson);
  return updatePerson;
}

function isoFutureDate () {
  const today = new Date();
  const oneYearFromNow = new Date(today);
  oneYearFromNow.setFullYear(today.getFullYear() + 1);
  return oneYearFromNow;
}

// For required fields that we want to include, even if not passed from the interface.
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
  passwordResetExpires: isoFutureDate(),
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

async function createPerson (updateDict) {
  // eslint-disable-next-line prefer-object-spread
  const mergedPerson = Object.assign({}, personObjTemplate, updateDict);
  const person = await prisma.person.create({ data: mergedPerson });
  return person;
}

async function comparePassword (person, candidatePassword, cb) {
  try {
    const verified = await bcrypt.verify(candidatePassword, person.password);
    cb(null, verified, person.password);
  } catch (err) {
    cb(err);
  }
}

module.exports = {
  comparePassword,
  createPerson,
  deleteOne,
  extractPersonVariablesToChange,
  findPersonById,
  findPersonListByIdList,
  findPersonListByParams,
  findOnePerson,
  PERSON_FIELDS_ACCEPTED,
  removeProtectedFieldsFromPerson,
  savePerson,
}; // Export the functions
