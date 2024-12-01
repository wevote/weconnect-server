// weconnect-server/models/personModel.js, parallel to /prisma/schema/person.prisma
// Dale 2024-12-01 I saw your comment Steve -- I'm just duplicating this for now to get some data to front end
// These can be refactored at will.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('@node-rs/bcrypt');

const prisma = new PrismaClient();

async function findPersonById (id) {
  const person = await prisma.person.findUnique({
    where: {
      id,
    },
  });
  return person;
}

function removeProtectedFieldsFromPerson (person) {
  const modifiedPerson = { ...person };
  delete modifiedPerson.emailVerificationToken;
  delete modifiedPerson.password;
  delete modifiedPerson.passwordResetExpires;
  delete modifiedPerson.passwordResetToken;
  return modifiedPerson;
}

async function findPersonListByIdList (idList, includeAllData = false) {
  const personList = await prisma.person.findMany({
    where: {
      id: { in: idList },
    },
  });
  let modifiedPerson = {};
  let modifiedPersonList = [];
  if (includeAllData) {
    modifiedPersonList = personList;
  } else {
    personList.forEach((person) => {
      modifiedPerson = removeProtectedFieldsFromPerson(person);
      modifiedPersonList.push(modifiedPerson);
    });
  }
  return modifiedPersonList;
}

async function findOnePerson (prms) {   // Find one with array
  const person = await prisma.person.findUnique({
    where: prms,
  });
  return person;
}

async function deleteOne (id) {
  await prisma.person.delete({
    where: {
      id,
    },
  });
}

async function savePerson (person) {
  const updatePerson = await prisma.person.update({
    where: {
      id: person.id,
    },
    data: {
      person,
    },
  });
  console.log(updatePerson);
}

function isoFutureDate () {
  const today = new Date();
  const oneYearFromNow = new Date(today);
  oneYearFromNow.setFullYear(today.getFullYear() + 1);
  return oneYearFromNow;
}

const personObjTemplate = {
  name: '',
  gender: '',
  location: '',
  email: '',
  website: '',
  picture: '',
  password: '',
  passwordResetToken: '',
  passwordResetExpires: isoFutureDate(),
  emailVerificationToken: '',
  emailVerified: false,

  snapchat: '',
  facebook: '',
  twitter: '',
  google: '',
  github: '',
  linkedin: '',
  steam: '',
  twitch: '',
  quickbooks: '',
  tokens: {},
};

async function createPerson (prms) {
  // eslint-disable-next-line prefer-object-spread
  const mergedPerson = Object.assign({}, personObjTemplate, prms);
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
  findPersonById,
  findPersonListByIdList,
  findOnePerson,
  savePerson,
}; // Export the functions
