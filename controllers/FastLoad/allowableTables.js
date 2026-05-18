// Security note: the master side of fast load will only return the data from the following table,
// Changing this table on local side by itself will not work

// The fast load apis will only return the data from the following tables
exports.allowableTables = [         // Row counts in production DB on 4/17/26
  // 'ClientSession',               // 449, do not copy to developer's instance
  // 'Meeting',                     // 0
  // 'MeetingAttendee',             // 0
  'Person',                         // 588
  'PersonAway',                     // 2
  'QuestionAnswer',                 // 5407
  'Questionnaire',                  // 4
  'QuestionnaireQuestion',          // 40
  // 'QuestionnaireQuestionFormer', // 0
  // 'RecurringMeeting',            // 0
  'Task',                           // 8992
  // 'TaskChangeLog',               // 0
  'TaskDefinition',                 // 79
  // 'TaskDependency',              // 0
  'TaskGroup',                      // 50
  'TaskGroupTeamLink',              // 210
  'Team',                           // 45
  // 'TeamChangeLog',               // 0
  // 'TeamGroup',                   // 0
  'TeamMember',                     // 748
  // 'TeamMemberAway',              // 0
  // 'TeamMemberFormer',            // 0
  // 'TeamRole',                    // 0
  // 'TeamRoleToPersonLink',        // 0
  // 'TeamToTeamRoleLink',          // 0
  // 'User',                        // Not used, should be surgically removed
  // '_prisma_migrations',          // no need to copy
  // 'session',                     // no value in copying the sessions table
  // 'QuestionnaireQuestionFormer', // Not used, should be removed from DB
];

exports.getAllowableTables = async (req, res) => res.json({
  allowableTables: this.allowableTables,
});
