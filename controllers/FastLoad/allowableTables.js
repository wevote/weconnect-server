// Security note: the master side of fast load will only return the data from the following table,
// Changing this table on local side by itself will not work

// The fast load apis will only return the data from the following tables
exports.allowableTables = [
  // 'ClientSession',
  'Meeting',                        // Suspect that this table is empty and unused
  'MeetingAttendee',                // Suspect that this table is empty and unused
  'Person',
  'PersonAway',
  'QuestionAnswer',
  'Questionnaire',
  'QuestionnaireQuestion',
  // 'QuestionnaireQuestionFormer', // Not used, should be removed from DB
  'RecurringMeeting',               // Suspect that this table is empty and unused
  'Task',
  // 'TaskChangeLog',               // Not used, should be removed from DB
  'TaskDefinition',
  'TaskDependency',                 // Suspect that this table is empty
  'TaskGroup',
  'TaskGroupTeamLink',
  'Team',
  // 'TeamChangeLog',               // Not used, should be removed from DB
  // 'TeamGroup',                   // Not used, should be removed from DB
  'TeamMember',
  // 'TeamMemberAway',              // Not used, should be removed from DB
  // 'TeamMemberFormer',            // Not used, should be removed from DB
  // 'TeamRole',                    // Not used, should be removed from DB
  // 'TeamRoleToPersonLink',        // Not used, should be removed from DB
  // 'TeamToTeamRoleLink',          // Not used, should be removed from DB
  // 'User',                        // Not used, should be surgically removed
  // '_prisma_migrations',          // no need to copy
  // 'session',                     // no value in copying the sessions table
];

exports.getAllowableTables = async (req, res) => res.json({
  allowableTables: this.allowableTables,
});
