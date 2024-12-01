// weconnect-server/controllers/apiController.js
const { findPersonListByIdList } = require('../models/personModel');

/**
 * GET /api/v1/retrieve-team
 * Retrieve a list of team members.
 */
exports.retrieveTeam = async (req, res) => {
  const jSonData = {
    success: false,
    status: '',
    teamList: [],
  };
  try {
    const teamList = await findPersonListByIdList([0, 1], includeAllData=false);
    jSonData.success = true;
    if (teamList) {
      jSonData.teamList = teamList;
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
