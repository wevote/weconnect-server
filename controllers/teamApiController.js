// weconnect-server/controllers/teamApiController.js
const { retrieveTeamMemberList } = require('./teamController');
const {
  createTeam, deleteOneTeamMember, findTeamById, findTeamListByParams,
  removeProtectedFieldsFromTeam, TEAM_FIELDS_ACCEPTED, updateOrCreateTeamMember,
} = require('../models/teamModel');
const { convertToInteger } = require('../utils/convertToInteger');
const { extractVariablesToChangeFromIncomingParams } = require('./dataTransformationUtils');

/**
 * GET /api/v1/add-person-to-team
 *
 */
exports.addPersonToTeam = async (request, response) => {
  let shouldAddPersonToTeam = false;

  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const personId = convertToInteger(queryParams.get('personId'));
  const teamId = convertToInteger(queryParams.get('teamId'));
  const teamMemberFirstName = queryParams.get('teamMemberFirstName');
  const teamMemberLastName = queryParams.get('teamMemberLastName');
  const teamName = queryParams.get('teamName');
  const changeDict = {
    teamMemberFirstName,
    teamMemberLastName,
    teamName,
  };
  // Set up the default JSON response.
  const jsonData = {
    addPersonToTeamSuccessful: false,
    personId: -1,
    status: '',
    success: true,
    teamId: -1,
    updateErrors: [],
  };
  try {
    jsonData.personId = personId;
    jsonData.teamId = teamId;
    jsonData.success = true;
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }

  try {
    if (personId >= 0 && teamId >= 0) {
      jsonData.status += 'PERSON_CAN_BE_ADDED ';
      shouldAddPersonToTeam = true;
    } else {
      jsonData.status += 'MISSING_REQUIRED_VARIABLES: personId OR teamId ';
      if (personId < 0) {
        jsonData.updateErrors.push('Missing required variable: personId');
      }
      if (teamId < 0) {
        jsonData.updateErrors.push('Missing required variable: teamId');
      }
    }

    if (shouldAddPersonToTeam) {
      // Note: This doesn't return a teamMember object
      await updateOrCreateTeamMember(personId, teamId, changeDict);
      jsonData.addPersonToTeamSuccessful = true;
      jsonData.firstName = teamMemberFirstName;
      jsonData.lastName = teamMemberLastName;
      jsonData.personId = personId;
      jsonData.status += 'PERSON_ADDED_TO_TEAM ';
      jsonData.success = true;
      jsonData.teamName = teamName;
      // console.log('Person added to team:', teamMember);
    }
  } catch (err) {
    console.error('Error while adding person to team:', err);
    jsonData.status += 'ERROR_ADDING_PERSON_TO_TEAM ';
    jsonData.status += err.message;
    jsonData.success = false;
  }

  response.json(jsonData);
};

/**
 * GET /api/v1/remove-person-from-team
 *
 */
exports.removePersonFromTeam = async (request, response) => {
  let shouldRemovePersonFromTeam = false;

  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const personId = convertToInteger(queryParams.get('personId'));
  const teamId = convertToInteger(queryParams.get('teamId'));
  // Set up the default JSON response.
  const jsonData = {
    removePersonFromTeamSuccessful: false,
    personId: -1,
    status: '',
    success: true,
    teamId: -1,
    updateErrors: [],
  };
  try {
    jsonData.personId = personId;
    jsonData.teamId = teamId;
    jsonData.success = true;
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }

  try {
    if (personId >= 0 && teamId >= 0) {
      jsonData.status += 'PERSON_CAN_BE_REMOVED ';
      shouldRemovePersonFromTeam = true;
    } else {
      jsonData.status += 'MISSING_REQUIRED_VARIABLES: personId OR teamId ';
      if (personId < 0) {
        jsonData.updateErrors.push('Missing required variable: personId');
      }
      if (teamId < 0) {
        jsonData.updateErrors.push('Missing required variable: teamId');
      }
    }

    if (shouldRemovePersonFromTeam) {
      // Note: This doesn't return a teamMember object
      await deleteOneTeamMember(personId, teamId);
      jsonData.removePersonFromTeamSuccessful = true;
      jsonData.personId = personId;
      jsonData.status += 'PERSON_REMOVED_FROM_TEAM ';
      jsonData.success = true;
    }
  } catch (err) {
    console.error('Error while removing person from team:', err);
    jsonData.status += 'ERROR_REMOVING_PERSON_FROM_TEAM: ';
    jsonData.status += err.message;
    jsonData.success = false;
  }

  response.json(jsonData);
};

/**
 * GET /api/v1/team-list-retrieve
 * Retrieve a list of team members.
 */
exports.teamListRetrieve = async (request, response) => {
  const jsonData = {
    status: '',
    success: true,
    teamList: [],
  };
  // let results;
  // const teamListModified = [];
  // let teamModified = {};
  try {
    const teamList = await findTeamListByParams({}, false);
    jsonData.success = true;
    if (teamList && teamList.length > 0) {
      const teamListModified = await Promise.all(teamList.map(async (team) => {
        const teamModified = { ...team };
        try {
          const results = await retrieveTeamMemberList(team.id);
          // console.log('teamListRetrieve retrieveTeamMemberList results:', results);
          teamModified.teamMemberList = results.teamMemberList;
          jsonData.status += results.status;
        } catch (err) {
          jsonData.status += 'FAILED_retrieveTeamMemberList ';
          console.error('Error retrieving team member list:', err);
        }
        return teamModified;
      }));
      jsonData.teamList = teamListModified;
      jsonData.status += 'TEAMS_FOUND ';
    } else {
      jsonData.status += 'TEAMS_NOT_FOUND ';
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }
  response.json(jsonData);
};

/**
 * GET /api/v1/team-retrieve
 * Retrieve the team, including a list of team members.
 */
exports.teamRetrieve = async (request, response) => {
  const jsonData = {
    status: '',
    success: true,
    teamId: -1, // We send -1 when a team doesn't exist
    teamMemberList: [],
  };
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const teamId = convertToInteger(queryParams.get('teamId'));
  // console.log('Team ID:', teamId);
  if (teamId >= 0) {
    jsonData.teamId = teamId;
  }
  /// Retrieve the team
  try {
    const team = await findTeamById(teamId);
    jsonData.success = true;
    if (team.id >= 0) {
      jsonData.status += 'TEAM_FOUND ';
      const modifiedTeamDict = removeProtectedFieldsFromTeam(team);
      const teamKeys = Object.keys(modifiedTeamDict);
      const teamValues = Object.values(modifiedTeamDict);
      for (let i = 0; i < teamKeys.length; i++) {
        jsonData[teamKeys[i]] = teamValues[i];
      }
      try {
        const results = await retrieveTeamMemberList(teamId);
        // console.log('teamRetrieve retrieveTeamMemberList results:', results);
        jsonData.teamMemberList = results.teamMemberList;
        jsonData.status += results.status;
      } catch (err) {
        jsonData.status += 'FAILED_retrieveTeamMemberList ';
        jsonData.success = false;
      }
      response.json(jsonData);
    } else {
      jsonData.status += 'TEAM_NOT_FOUND ';
      response.json(jsonData);
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
    response.json(jsonData);
  }
};

/**
 * GET /api/v1/team-save
 *
 */
exports.teamSave = async (request, response) => {
  let shouldCreateTeam = false;

  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const teamId = convertToInteger(queryParams.get('teamId'));
  const changeDict = extractVariablesToChangeFromIncomingParams(queryParams, TEAM_FIELDS_ACCEPTED);
  // Set up the default JSON response.
  const jsonData = {
    teamCreated: false,
    teamId: -1,
    status: '',
    success: true,
    updateErrors: [],
  };
  try {
    jsonData.teamId = teamId;
    jsonData.success = true;
    const keys = Object.keys(changeDict);
    const values = Object.values(changeDict);
    for (let i = 0; i < keys.length; i++) {
      jsonData[keys[i]] = values[i];
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }

  try {
    if (teamId >= 0) {
      jsonData.status += 'TEAM_FOUND ';
    } else {
      // TODO make sure a team with exact teamName doesn't already exist in the database
      jsonData.status += 'TEAM_TO_BE_CREATED ';
      shouldCreateTeam = true;
    }

    if (shouldCreateTeam) {
      //
      const team = await createTeam(changeDict);
      console.log('Created new team:', team);
      jsonData.teamCreated = true;
      jsonData.teamId = team.id;
      jsonData.status += 'TEAM_CREATED ';
      const modifiedTeamDict = removeProtectedFieldsFromTeam(team);
      const teamKeys = Object.keys(modifiedTeamDict);
      const teamValues = Object.values(modifiedTeamDict);
      for (let i = 0; i < teamKeys.length; i++) {
        jsonData[teamKeys[i]] = teamValues[i];
      }
    }
  } catch (err) {
    console.error('Error while saving team:', err);
    jsonData.status += err.message;
    jsonData.success = false;
    jsonData.updateErrors.push('Missing required field: teamName');
  }

  response.json(jsonData);
};
