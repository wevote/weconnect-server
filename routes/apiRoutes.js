const teamApiController = require('../controllers/teamApiController');
const personApiController = require('../controllers/personApiController');
const questionnaireApiController = require('../controllers/questionnaireApiController');

/**
 * WeConnect API routes.
 */
module.exports = function(weconnectServer) {
  weconnectServer.get('/apis/v1/add-person-to-team', teamApiController.addPersonToTeam);
  weconnectServer.get('/apis/v1/person-list-retrieve', personApiController.personListRetrieve);
  weconnectServer.get('/apis/v1/person-retrieve', personApiController.personRetrieve);
  weconnectServer.get('/apis/v1/person-save', personApiController.personSave);
  weconnectServer.get('/apis/v1/question-list-retrieve', questionnaireApiController.questionListRetrieve);
  weconnectServer.get('/apis/v1/questionnaire-list-retrieve', questionnaireApiController.questionnaireListRetrieve);
  weconnectServer.get('/apis/v1/questionnaire-save', questionnaireApiController.questionnaireSave);
  weconnectServer.get('/apis/v1/question-save', questionnaireApiController.questionSave);
  weconnectServer.get('/apis/v1/remove-person-from-team', teamApiController.removePersonFromTeam);
  weconnectServer.get('/apis/v1/team-list-retrieve', teamApiController.teamListRetrieve);
  weconnectServer.get('/apis/v1/team-save', teamApiController.teamSave);
  weconnectServer.get('/apis/v1/team-retrieve', teamApiController.teamRetrieve);
  // weconnectServer.get('/apis/v1/secret-retrieve', prismaUserController.getSignup);
  weconnectServer.get('/apis/v1/auth', personApiController.getAuth);

  weconnectServer.post('/apis/v1/login', personApiController.postLogin);
  weconnectServer.post('/apis/v1/logout', personApiController.logout);
  weconnectServer.post('/apis/v1/signup', personApiController.postSignup);
};
