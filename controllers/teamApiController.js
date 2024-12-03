// weconnect-server/controllers/apiController.js
const { findPersonListByIdList } = require('../models/personModel');

/**
 * GET /api/v1/team-retrieve
 * Retrieve a list of team members.
 */
exports.teamRetrieve = async (req, res) => {
  const jSonData = {
    success: false,
    status: '',
    teamId: -1, // We send -1 when a team doesn't exist
    teamMemberList: [],
  };
  try {
    const teamMemberList = await findPersonListByIdList([0, 1]);
    jSonData.success = true;
    if (teamMemberList) {
      // TODO augment with team membership details
      jSonData.teamId = 1; // for now, just hardcoding the teamId
      jSonData.teamMemberList = teamMemberList;
      jSonData.status += 'PEOPLE_FOUND ';
    } else {
      jSonData.status += 'PEOPLE_NOT_FOUND ';
    }
  } catch (err) {
    jSonData.status += err.message;
    jSonData.success = false;
  }
  res.json(jSonData);
};
