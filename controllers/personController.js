// weconnect-server/controllers/personController.js

const { findPersonById, getAccessRightsForPerson } = require('../models/personModel');
const { getPersonIdBySessionId } = require('../models/clientSessionModel');

async function getViewerAccessRights (request) {
  let isAuthenticated = false;
  try {
    isAuthenticated = request.isAuthenticated();
  } catch (error) {
    console.error('Error in personCanSeeOrDo isAuthenticated: ', error);
    return false;
  }
  const personId = await getPersonIdBySessionId(request.sessionID || 0);
  const person = personId ? await findPersonById(personId || 0) : undefined;
  if (!person) {
    console.error('Undefined person in getViewerAccessRights isAuthenticated: ', isAuthenticated, ', request: ', request);
    return {};
  } else {
    const accessRights = getAccessRightsForPerson(person);
    if (accessRights) {
      return accessRights;
    } else {
      console.error('Undefined accessRights for person: ', person);
      return {};
    }
  }
}

// Parallel to weconnect-client viewerCanSeeOrDo
async function personCanSeeOrDo (accessRightName, accessRights) {
  if (accessRights && (accessRightName in accessRights)) {
    return accessRights[accessRightName];
  } else {
    console.error('Undefined access right in personCanSeeOrDo: ', accessRightName, ', accessRights: ', accessRights);
    return false;
  }
}

const displayFullNamePreferred = (person) => {
  let fullName = '';
  if (person.firstNamePreferred) {
    fullName += person.firstNamePreferred;
  } else if (person.firstName) {
    fullName += person.firstName;
  }
  if (fullName.length > 0 && person.lastName) {
    fullName += ' ';
  }
  if (person.lastName) {
    fullName += person.lastName;
  }
  return fullName;
};

module.exports = {
  displayFullNamePreferred,
  getViewerAccessRights,
  personCanSeeOrDo,
};
