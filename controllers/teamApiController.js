// weconnect-server/controllers/teamApiController.js
const { findPersonListByIdList } = require('../models/personModel');
const {
  createTeam, createTeamMember, findTeamById, findTeamListByParams,
  removeProtectedFieldsFromTeam, TEAM_FIELDS_ACCEPTED,
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
  const teamMemberName = queryParams.get('teamMemberName');
  const teamName = queryParams.get('teamName');
  const changeDict = {
    personId,
    teamId,
    teamMemberName,
    teamName,
  };
  // Set up the default JSON response.
  const jSonData = {
    addPersonToTeamSuccessful: false,
    personId: '-1',
    success: false,
    status: '',
    teamId: '-1',
    updateErrors: [],
  };
  try {
    jSonData.personId = personId;
    jSonData.teamId = teamId;
    jSonData.success = true;
  } catch (err) {
    jSonData.status += err.message;
    jSonData.success = false;
  }

  try {
    if (personId >= 0 && teamId >= 0) {
      jSonData.status += 'PERSON_CAN_BE_ADDED ';
      shouldAddPersonToTeam = true;
    } else {
      jSonData.status += 'MISSING_REQUIRED_VARIABLES: personId OR teamId ';
      if (personId < 0) {
        jSonData.updateErrors.push('Missing required variable: personId');
      }
      if (teamId < 0) {
        jSonData.updateErrors.push('Missing required variable: teamId');
      }
    }

    if (shouldAddPersonToTeam) {
      //
      await createTeamMember(changeDict);
      jSonData.status += 'PERSON_ADDED_TO_TEAM ';
      jSonData.success = true;
    }
  } catch (err) {
    console.error('Error while adding person to team:', err);
    jSonData.status += err.message;
    jSonData.success = false;
  }

  response.json(jSonData);
};

/**
 * GET /api/v1/team-list-retrieve
 * Retrieve a list of team members.
 */
exports.teamListRetrieve = async (request, response) => {
  const jSonData = {
    success: false,
    status: '',
    teamList: [],
  };
  try {
    const teamList = await findTeamListByParams({}, false);
    jSonData.success = true;
    if (teamList) {
      jSonData.teamList = teamList;
      jSonData.status += 'TEAMS_FOUND ';
    } else {
      jSonData.status += 'TEAMS_NOT_FOUND ';
    }
  } catch (err) {
    jSonData.status += err.message;
    jSonData.success = false;
  }
  response.json(jSonData);
};

/**
 * GET /api/v1/team-retrieve
 * Retrieve the team, including a list of team members.
 */
exports.teamRetrieve = async (request, response) => {
  const jSonData = {
    success: false,
    status: '',
    teamId: -1, // We send -1 when a team doesn't exist
    teamMemberList: [],
  };
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const teamId = convertToInteger(queryParams.get('teamId'));
  console.log('Team ID:', teamId);
  if (teamId >= 0) {
    jSonData.teamId = teamId;
  }
  try {
    const team = await findTeamById(teamId);
    jSonData.success = true;
    if (team.id >= 0) {
      jSonData.status += 'TEAM_FOUND ';
      const modifiedTeamDict = removeProtectedFieldsFromTeam(team);
      const teamKeys = Object.keys(modifiedTeamDict);
      const teamValues = Object.values(modifiedTeamDict);
      for (let i = 0; i < teamKeys.length; i++) {
        jSonData[teamKeys[i]] = teamValues[i];
      }
    } else {
      jSonData.status += 'TEAM_NOT_FOUND ';
    }
  } catch (err) {
    jSonData.status += err.message;
    jSonData.success = false;
  }
  try {
    const teamMemberList = await findPersonListByIdList([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    jSonData.success = true;
    if (teamMemberList) {
      // TODO augment with team membership details
      jSonData.teamMemberList = teamMemberList;
      jSonData.status += 'TEAM_MEMBERS_FOUND ';
    } else {
      jSonData.status += 'TEAM_MEMBERS_NOT_FOUND ';
    }
  } catch (err) {
    jSonData.status += err.message;
    jSonData.success = false;
  }
  response.json(jSonData);
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
  const jSonData = {
    teamCreated: false,
    teamId: '-1',
    success: false,
    status: '',
    updateErrors: [],
  };
  try {
    jSonData.teamId = teamId;
    jSonData.success = true;
    const keys = Object.keys(changeDict);
    const values = Object.values(changeDict);
    for (let i = 0; i < keys.length; i++) {
      jSonData[keys[i]] = values[i];
    }
  } catch (err) {
    jSonData.status += err.message;
    jSonData.success = false;
  }

  try {
    if (teamId >= 0) {
      jSonData.status += 'TEAM_FOUND ';
    } else {
      // TODO make sure a team with exact teamName doesn't already exist in the database
      jSonData.status += 'TEAM_TO_BE_CREATED ';
      shouldCreateTeam = true;
    }

    if (shouldCreateTeam) {
      //
      const team = await createTeam(changeDict);
      console.log('Created new team:', team);
      jSonData.teamCreated = true;
      jSonData.teamId = team.id;
      jSonData.status += 'TEAM_CREATED ';
      const modifiedTeamDict = removeProtectedFieldsFromTeam(team);
      const teamKeys = Object.keys(modifiedTeamDict);
      const teamValues = Object.values(modifiedTeamDict);
      for (let i = 0; i < teamKeys.length; i++) {
        jSonData[teamKeys[i]] = teamValues[i];
      }
    }
  } catch (err) {
    console.error('Error while saving team:', err);
    jSonData.status += err.message;
    jSonData.success = false;
    jSonData.updateErrors.push('Missing required field: teamName');
  }

  response.json(jSonData);
};
