// weconnect-server/controllers/personApiController.js
const bcrypt = require('@node-rs/bcrypt');
const { createPerson, findPersonById, findPersonListByParams, PERSON_FIELDS_ACCEPTED,
  removeProtectedFieldsFromPerson, savePerson } = require('../models/personModel');
const { extractVariablesToChangeFromIncomingParams } = require('./dataTransformationUtils');
const { updateOrCreateTeamMember } = require('../models/teamModel');
const { convertToInteger } = require('../utils/convertToInteger');

/**
 * GET /api/v1/person-list-retrieve
 * Retrieve a list of people.
 */
exports.personListRetrieve = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const searchText = queryParams.get('searchText');

  const jsonData = {
    isSearching: false,
    personList: [],
    success: true,
    status: '',
  };
  try {
    const params = {};
    if (searchText) {
      jsonData.isSearching = true;
      params.OR = [
        { firstName: { contains: searchText, mode: 'insensitive' } },
        { firstNamePreferred: { contains: searchText, mode: 'insensitive' } },
        { lastName: { contains: searchText, mode: 'insensitive' } },
        { emailPersonal: { contains: searchText, mode: 'insensitive' } },
      ];
    }
    const personList = await findPersonListByParams(params);
    jsonData.success = true;
    if (personList) {
      jsonData.personList = personList;
      jsonData.status += 'PERSON_LIST_FOUND ';
    } else {
      jsonData.status += 'PERSON_LIST_NOT_FOUND ';
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }
  response.json(jsonData);
};

/**
 * GET /api/v1/person-retrieve
 * Retrieve one person.
 */
exports.personRetrieve = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const personId = convertToInteger(queryParams.get('personId'));
  const searchText = queryParams.get('searchText');

  const jsonData = {
    success: true,
    status: '',
  };
  try {
    const params = {};
    if (searchText) {
      jsonData.isSearching = true;
      params.OR = [
        { firstName: { contains: searchText, mode: 'insensitive' } },
        { firstNamePreferred: { contains: searchText, mode: 'insensitive' } },
        { lastName: { contains: searchText, mode: 'insensitive' } },
        { emailPersonal: { contains: searchText, mode: 'insensitive' } },
      ];
    }
    const person = await findPersonById(personId);
    jsonData.success = true;
    if (person) {
      jsonData.personId = person.id;
      const keys = Object.keys(person);
      const values = Object.values(person);
      for (let i = 0; i < keys.length; i++) {
        jsonData[keys[i]] = values[i];
      }
      jsonData.status += 'PERSON_FOUND ';
    } else {
      jsonData.status += 'PERSON_NOT_FOUND ';
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }
  response.json(jsonData);
};

/**
 * GET /api/v1/person-save
 *
 */
exports.personSave = async (request, response) => {
  let shouldCreatePerson = false;
  let shouldSavePerson = false;

  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  let personId = convertToInteger(queryParams.get('personId'));
  const teamId = convertToInteger(queryParams.get('teamId'));
  const teamName = queryParams.get('teamName');
  const teamMemberFirstName = queryParams.get('firstNameToBeSaved');
  const teamMemberLastName = queryParams.get('lastNameToBeSaved');
  const personChangeDict = extractVariablesToChangeFromIncomingParams(queryParams, PERSON_FIELDS_ACCEPTED);
  // Set up the default JSON response.
  const jsonData = {
    addPersonToTeamSuccessful: false,
    personCreated: false,
    personId: '-1',
    success: false,
    status: '',
    updateErrors: [],
  };
  try {
    jsonData.personId = personId;
    jsonData.success = true;
    const keys = Object.keys(personChangeDict);
    const values = Object.values(personChangeDict);
    for (let i = 0; i < keys.length; i++) {
      jsonData[keys[i]] = values[i];
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }

  try {
    if (personId >= 0) {
      jsonData.status += 'PERSON_FOUND ';
      shouldSavePerson = true;
    } else {
      // TODO make sure a person with exact firstName/lastName or emailPersonal doesn't already exist in the database
      jsonData.status += 'PERSON_TO_BE_CREATED ';
      shouldCreatePerson = true;
    }

    if (shouldCreatePerson) {
      //
      const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      personChangeDict.password = await bcrypt.hash(tempPassword, 10);
      const person = await createPerson(personChangeDict);
      personId = person.id;
      // console.log('Created new person:', person);
      jsonData.personCreated = true;
      jsonData.personId = person.id;
      jsonData.status += 'PERSON_CREATED ';
      const modifiedPersonDict = removeProtectedFieldsFromPerson(person);
      const personKeys = Object.keys(modifiedPersonDict);
      const personValues = Object.values(modifiedPersonDict);
      for (let i = 0; i < personKeys.length; i++) {
        jsonData[personKeys[i]] = personValues[i];
      }
    } else if (shouldSavePerson) {
      personChangeDict.id = personId;
      // console.log('Updating person:', personChangeDict);
      const person = await savePerson(personChangeDict);
      jsonData.personSaved = true;
      jsonData.personId = person.id;
      jsonData.status += 'PERSON_UPDATED ';
      const modifiedPersonDict = removeProtectedFieldsFromPerson(person);
      const personKeys = Object.keys(modifiedPersonDict);
      const personValues = Object.values(modifiedPersonDict);
      for (let i = 0; i < personKeys.length; i++) {
        jsonData[personKeys[i]] = personValues[i];
      }
    }
  } catch (err) {
    console.error('Error while saving person:', err);
    jsonData.status += err.message;
    jsonData.success = false;
    jsonData.updateErrors.push('Missing required field: emailPersonal');
  }
  try {
    //
    if (personId >= 0 && teamId >= 0 && jsonData.personCreated) {
      // Add the person to the team
      const teamMemberChangeDict = {
        teamMemberFirstName,
        teamMemberLastName,
        teamName,
      };
      await updateOrCreateTeamMember(personId, teamId, teamMemberChangeDict);
      jsonData.addPersonToTeamSuccessful = true;
    }
  } catch (err) {
    console.error('Error while adding person to team:', err);
    jsonData.status += err.message;
    jsonData.success = false;
  }

  response.json(jsonData);
};
