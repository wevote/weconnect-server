// weconnect-server/controllers/teamApiController.js
const { retrieveTeamMemberList } = require('./teamController');
const {
  saveTeam, createTeam, deleteOneTeamMember, findOneTeam, findTeamById, findTeamListByParams,
  removeProtectedFieldsFromTeam, TEAM_FIELDS_ACCEPTED, updateOrCreateTeamMember,
  deleteTeam,
} = require('../models/teamModel');
const { convertToInteger } = require('../utils/convertToInteger');
const { extractVariablesToChangeFromIncomingParams } = require('./dataTransformationUtils');
const { TEAM_MEMBER_FIELDS_ACCEPTED } = require('../models/teamModel');
const { createProfileChangeLogEntry, findPersonById } = require('../models/personModel');
// const { getAllAccessRightsForPerson } = require('./personController');

/**
 * GET /api/v1/add-person-to-team
 *
 */
exports.addPersonToTeam = async (request, response) => {
  let shouldAddPersonToTeam = false;

  const queryString = request.url.split('?')[1];
  const queryParams = new URLSearchParams(queryString);
  const paramsObject = Object.fromEntries(queryParams.entries());
  const personId = convertToInteger(paramsObject.personId);
  const teamId = convertToInteger(paramsObject.teamId);
  // 2026-April-3 In this pull request: https://github.com/wevote/weconnect-server/pull/124/changes
  //  the following lines replaced the call to extractVariablesToChangeFromIncomingParams, but broke the ability to
  //  add a team lead. Rolling back.
  // const teamMemberUpdateDict = {};
  // Object.keys(paramsObject).forEach((key) => {
  //   const value = paramsObject[key];
  //   if (key in TEAM_MEMBER_FIELDS_ACCEPTED) {
  //     teamMemberUpdateDict[key] = value;
  //   }
  // });
  const teamMemberUpdateDict = extractVariablesToChangeFromIncomingParams(
    queryParams,
    TEAM_MEMBER_FIELDS_ACCEPTED,
  );

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
      // const ret =
      await updateOrCreateTeamMember(personId, teamId, teamMemberUpdateDict);

      try {
        // Fetch names for the log description
        const actorId = request.user?.id || paramsObject.changedById || -1;
        const teamName = paramsObject.teamName || 'the team';

        // Construct the hybrid description
        const detailedDescription = `ADDED [Team]: ${teamName}`;

        await createProfileChangeLogEntry({
          personId,
          changedById: actorId,
          changeDescription: detailedDescription,
          teamName: teamName,
        });
      } catch (logErr) {
        console.error('Change log failed but team update succeeded:', logErr);
      }

      jsonData.addPersonToTeamSuccessful = true;
      jsonData.personId = personId;
      jsonData.status += 'PERSON_ADDED_TO_TEAM ';
      jsonData.success = true;
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

      // Track the change
      try {
        // Fetch names for the log description
        const actorId = request.user?.id || -1;

        // Fetch the team to get the name
        const team = await findTeamById(teamId);

        // Use the name from the DB, fallback if team not found
        const teamName = team ? team.teamName : 'the team';

        // Construct the hybrid description
        const detailedDescription = `CLEARED [Team]: ${teamName}`;

        await createProfileChangeLogEntry({
          personId,
          changedById: actorId,
          changeDescription: detailedDescription,
          teamName: teamName,
        });
      } catch (logErr) {
        console.error('Change log failed but team update succeeded:', logErr);
      }

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

  try {
    const teamList = await findTeamListByParams({}, false);
    jsonData.success = true;
    if (teamList && teamList.length > 0) {
      jsonData.teamList = await Promise.all(teamList.map(async (team) => {
        const teamModified = { ...team };
        try {
          const results = await retrieveTeamMemberList(team.id);
          // console.log('teamListRetrieve retrieveTeamMemberList results:', results);
          teamModified.teamMemberInfoList = results.teamMemberInfoList; // Just the contents of TeamMember table (without Person table details)
          teamModified.teamMemberList = results.teamMemberList; // We want to phase this out
          jsonData.status += results.status;
        } catch (err) {
          jsonData.status += 'FAILED_retrieveTeamMemberList ';
          console.error('Error retrieving team member list:', err);
        }
        return teamModified;
      }));
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
        jsonData.teamMemberInfoList = results.teamMemberInfoList; // Just the contents of TeamMember table (without Person table details)
        jsonData.teamMemberList = results.teamMemberList; // We want to phase this out
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
  const departmentsChanged =
    queryParams.get('departmentsChanged') === 'true' ||
    queryParams.get('departmentsToBeSavedChanged') === 'true';
  if (departmentsChanged) {
    const departmentsFromRepeatedParams = [
      ...queryParams.getAll('departments'),
      ...queryParams.getAll('departmentsToBeSaved'),
    ]
      .map((department) => (typeof department === 'string' ? department.trim() : department))
      .filter((department) => typeof department === 'string' && department !== '');

    if (departmentsFromRepeatedParams.length > 1) {
      changeDict.departments = departmentsFromRepeatedParams;
    } else if (departmentsFromRepeatedParams.length === 1) {
      const oneDepartment = departmentsFromRepeatedParams[0];
      if (oneDepartment.startsWith('[') && oneDepartment.endsWith(']')) {
        try {
          const parsedDepartments = JSON.parse(oneDepartment);
          if (Array.isArray(parsedDepartments)) {
            changeDict.departments = parsedDepartments
              .map((department) => (typeof department === 'string' ? department.trim() : department))
              .filter((department) => typeof department === 'string' && department !== '');
          } else {
            changeDict.departments = [oneDepartment];
          }
        } catch (error) {
          changeDict.departments = oneDepartment
            .split(',')
            .map((department) => department.trim())
            .filter((department) => department !== '');
        }
      } else if (oneDepartment.includes(',')) {
        changeDict.departments = oneDepartment
          .split(',')
          .map((department) => department.trim())
          .filter((department) => department !== '');
      } else {
        changeDict.departments = [oneDepartment];
      }
    } else {
      changeDict.departments = [];
    }
  }
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
      const team = await createTeam(changeDict);
      console.log('Created new team:', team);
      jsonData.teamCreated = true;
      jsonData.teamUpdated = false;
      jsonData.teamId = team.id;
      jsonData.status += 'TEAM_CREATED ';
      const modifiedTeamDict = removeProtectedFieldsFromTeam(team);
      const teamKeys = Object.keys(modifiedTeamDict);
      const teamValues = Object.values(modifiedTeamDict);
      for (let i = 0; i < teamKeys.length; i++) {
        jsonData[teamKeys[i]] = teamValues[i];
      }
    } else {
      const team = await findOneTeam({ id: teamId });
      if (!team) {
        jsonData.status += 'TEAM_NOT_FOUND ';
        jsonData.success = false;
        jsonData.updateErrors.push('Team not found');
        response.json(jsonData);
        return;
      }

      const changedFieldCount = Object.keys(changeDict).length;
      if (changedFieldCount === 0) {
        jsonData.status += 'NO_CHANGES_DETECTED ';
      } else {
        const savedTeam = await saveTeam({ id: teamId, ...changeDict });
        const modifiedTeamDict = removeProtectedFieldsFromTeam(savedTeam);
        const teamKeys = Object.keys(modifiedTeamDict);
        const teamValues = Object.values(modifiedTeamDict);
        for (let i = 0; i < teamKeys.length; i++) {
          jsonData[teamKeys[i]] = teamValues[i];
        }
      }
      jsonData.teamCreated = false;
      jsonData.teamUpdated = true;
      jsonData.teamId = teamId;
      jsonData.status += 'TEAM_UPDATED ';
    }
  } catch (err) {
    console.error('Error while saving team:', err);
    jsonData.status += err.message;
    jsonData.success = false;
    jsonData.updateErrors.push('Missing required field: teamName');
  }

  response.json(jsonData);
};

/**
 * GET /api/v1/team-delete
 */
exports.teamDelete = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const teamId = convertToInteger(queryParams.get('teamId'));

  // TODO, this should also clean up dependent data like TeamMembers that reference this team

  // Set up the default JSON response.
  const jsonData = {
    teamDeleted: false,
    teamId,
    status: '',
    success: true,
    updateErrors: [],
  };

  try {
    if (parseInt(teamId) >= 0) {
      jsonData.status += 'TEAM_TO_BE_DELETED ';
      const team = await deleteTeam(teamId);
      console.log('Deleted team:', teamId);
      jsonData.teamDeleted = true;
      jsonData.teamId = team.id;
      jsonData.status += 'TEAM_DELETED ';
    }
  } catch (err) {
    console.error('Error while deleting team:', err);
    jsonData.status += err.message;
    jsonData.success = false;
  }

  response.json(jsonData);
};
