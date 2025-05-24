// Security note: the master side of fast load will only return the data from the following table,
// Changing this table on local side by itself will not work

// The fast load apis will only return the data from the following tables
exports.allowableTables = [
  // 'ClientSession',
  'Meeting',
  'MeetingAttendee',
  'Person',
  'PersonAway',
  'QuestionAnswer',
  'Questionnaire',
  'QuestionnaireQuestion',
  'QuestionnaireQuestionFormer',
  'RecurringMeeting',
  'Task',
  'TaskChangeLog',
  'TaskDefinition',
  'TaskDependency',
  'TaskGroup',
  'TaskGroupTeamLink',
  'Team',
  'TeamChangeLog',
  'TeamGroup',
  'TeamMember',
  'TeamMemberAway',
  'TeamMemberFormer',
  'TeamRole',
  'TeamRoleToPersonLink',
  'TeamToTeamRoleLink',
  // 'User',
  // '_prisma_migrations',
  // 'session',
];

exports.getAllowableTables = async (req, res) => res.json({
  allowableTables: this.allowableTables,
});
