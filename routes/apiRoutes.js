const meetingApiController = require('../controllers/meetingApiController');
const personApiController = require('../controllers/personApiController');
const googleApiController = require('../controllers/googleApiController');
const questionnaireApiController = require('../controllers/questionnaireApiController');
const taskApiController = require('../controllers/taskApiController');
const teamApiController = require('../controllers/teamApiController');
const { slackChannelInvite, slackGetPresence, slackSendMessage, slackListUsers, slackChannelMembers } = require('../controllers/slackApiController');
const { updateDbFromCsv } = require('../controllers/updateSqlFromCsvController');
const { jazzGetApplicants, jazzGetUsers } = require('../controllers/jazzHrController');

/**
 * WeConnect API routes.
 */
module.exports = function setupWeConnectRoutes (weconnectServer) {
  weconnectServer.get('/apis/v1/add-person-to-team', teamApiController.addPersonToTeam);
  weconnectServer.get('/apis/v1/answer-list-save', questionnaireApiController.answerListSave);
  weconnectServer.get('/apis/v1/meeting-save', meetingApiController.meetingSave);
  weconnectServer.get('/apis/v1/person-away-save', personApiController.personAwaySave);
  weconnectServer.get('/apis/v1/person-list-retrieve', personApiController.personListRetrieve);
  weconnectServer.get('/apis/v1/person-retrieve', personApiController.personRetrieve);
  weconnectServer.get('/apis/v1/person-retrieve-by-email', personApiController.personRetrieveByEmail);
  weconnectServer.get('/apis/v1/person-save', personApiController.personSave);
  weconnectServer.get('/apis/v1/question-list-retrieve', questionnaireApiController.questionListRetrieve);
  weconnectServer.get('/apis/v1/question-list-save', questionnaireApiController.questionListSave);
  weconnectServer.get('/apis/v1/questionnaire-list-retrieve', questionnaireApiController.questionnaireListRetrieve);
  weconnectServer.get('/apis/v1/questionnaire-responses-list-retrieve', questionnaireApiController.questionnaireResponsesListRetrieve);
  weconnectServer.get('/apis/v1/questionnaire-save', questionnaireApiController.questionnaireSave);
  weconnectServer.get('/apis/v1/question-save', questionnaireApiController.questionSave);
  weconnectServer.get('/apis/v1/remove-person-from-team', teamApiController.removePersonFromTeam);
  weconnectServer.get('/apis/v1/task-definition-list-retrieve', taskApiController.taskDefinitionListRetrieve);
  weconnectServer.get('/apis/v1/task-definition-save', taskApiController.taskDefinitionSave);
  weconnectServer.get('/apis/v1/task-group-team-link-delete', taskApiController.taskGroupTeamLinkDelete);
  weconnectServer.get('/apis/v1/task-group-team-link-list-retrieve', taskApiController.taskGroupTeamLinkListRetrieve);
  weconnectServer.get('/apis/v1/task-group-team-link-save', taskApiController.taskGroupTeamLinkSave);
  weconnectServer.get('/apis/v1/task-group-list-retrieve', taskApiController.taskGroupListRetrieve);
  weconnectServer.get('/apis/v1/task-group-save', taskApiController.taskGroupSave);
  weconnectServer.get('/apis/v1/task-save', taskApiController.taskSave);
  weconnectServer.get('/apis/v1/task-status-list-retrieve', taskApiController.taskStatusListRetrieve);
  weconnectServer.get('/apis/v1/team-list-retrieve', teamApiController.teamListRetrieve);
  weconnectServer.get('/apis/v1/team-save', teamApiController.teamSave);
  weconnectServer.get('/apis/v1/team-delete', teamApiController.teamDelete);
  weconnectServer.get('/apis/v1/team-retrieve', teamApiController.teamRetrieve);

  weconnectServer.post('/apis/v1/get-auth', personApiController.getAuth);
  weconnectServer.post('/apis/v1/google-create-user', googleApiController.googleCreateUserAccount);
  weconnectServer.post('/apis/v1/google-delete-user', googleApiController.googleDeleteUserAccount);
  weconnectServer.post('/apis/v1/google-get-user-info', googleApiController.googleGetUserInfo);
  weconnectServer.post('/apis/v1/google-get-user-list', googleApiController.googleGetUserList);
  weconnectServer.post('/apis/v1/google-reset-user-password', googleApiController.googleResetUserPassword);
  weconnectServer.post('/apis/v1/google-revoke-sharing', googleApiController.googleRevokeShare);
  weconnectServer.post('/apis/v1/google-share-drive-access', googleApiController.googleShareDriveAccess);
  weconnectServer.post('/apis/v1/google-transfer-drive-access', googleApiController.googleDriveTransferOwnership);
  weconnectServer.post('/apis/v1/jazz-get-applicants', jazzGetApplicants);
  weconnectServer.post('/apis/v1/jazz-get-users', jazzGetUsers);
  weconnectServer.post('/apis/v1/login', personApiController.login);
  weconnectServer.post('/apis/v1/logout', personApiController.logout);
  weconnectServer.post('/apis/v1/save-password', personApiController.savePassword);
  weconnectServer.post('/apis/v1/send-email-code', personApiController.sendEmailCode);
  weconnectServer.post('/apis/v1/signup', personApiController.signup);
  weconnectServer.post('/apis/v1/slack-channel-invite', slackChannelInvite);
  weconnectServer.post('/apis/v1/slack-channel-members', slackChannelMembers);
  weconnectServer.post('/apis/v1/slack-get-presence', slackGetPresence);
  weconnectServer.post('/apis/v1/slack-list-users', slackListUsers);
  weconnectServer.post('/apis/v1/slack-send-message', slackSendMessage);
  weconnectServer.post('/apis/v1/update-db-from-csv', updateDbFromCsv);
  weconnectServer.post('/apis/v1/verify-email-code', personApiController.verifyEmailCode);
};
