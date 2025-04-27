// weconnect-server/controllers/personController.js

const { findPersonById, getAccessRightsForPerson, SITE_SUPER_USERS } = require('../models/personModel');
const { getPersonIdsByTeamDict, getTeamAccessRightsForPerson } = require('../models/teamModel');
const { getPersonIdBySessionId } = require('../models/clientSessionModel');

async function getAllAccessRightsForPerson (request) {
  let accessRights = {};
  let personIdsByTeam = {}; // key: teamId, value: list of personIds active in the team
  let teamAccessRights = {};
  let isAuthenticated = false;
  try {
    isAuthenticated = request.isAuthenticated();
  } catch (error) {
    console.error('Error in personCanSeeOrDo isAuthenticated: ', error);
    return false;
  }
  const viewerPersonId = await getPersonIdBySessionId(request.sessionID || 0);
  const viewerPerson = viewerPersonId ? await findPersonById(viewerPersonId || 0) : undefined;
  if (!viewerPerson) {
    // 2/28/24 TODO: After a logout there will not be a viewerPerson, and logging the request floods the log
    // console.error('Undefined viewerPerson in getAllAccessRightsForPerson isAuthenticated: ', isAuthenticated, ', request: ', request);
    console.error('Undefined viewerPerson in getAllAccessRightsForPerson isAuthenticated: ', isAuthenticated);
    return {};
  } else {
    if (viewerPerson && SITE_SUPER_USERS && SITE_SUPER_USERS.includes(viewerPerson.emailOfficial)) {
      // Temporary until we get database admin tool set up
      viewerPerson.isAdmin = true;
    }
    accessRights = getAccessRightsForPerson(viewerPerson);
    teamAccessRights = await getTeamAccessRightsForPerson(viewerPerson);
    personIdsByTeam = await getPersonIdsByTeamDict();
  }
  return {
    accessRights,
    isAuthenticated,
    personIdsByTeam,
    teamAccessRights,
    viewerPersonId,
  };
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
  getAllAccessRightsForPerson,
  personCanSeeOrDo,
};
