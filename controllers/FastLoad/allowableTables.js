// Security note: the master side of fast load will only return the data from the following table,
// Changing this table on local side by itself will not work

// The fast load apis will only return the data from the following tables
exports.allowableTables = [         // Row counts on 4/1/26
  // 'ClientSession',               // 449, do not copy to developer's instance
  'Meeting',                        // 0 Rows in production on 4/1/26
  'MeetingAttendee',                // 0 Rows in production on 4/1/26
  'Person',                         // 565
  'PersonAway',                     // 2
  'QuestionAnswer',                 // 4995
  'Questionnaire',                  // 4
  'QuestionnaireQuestion',          // 40
  // 'QuestionnaireQuestionFormer', // 0 Rows in production on 4/1/26
  'RecurringMeeting',               // 0 Rows in production on 4/1/26
  'Task',                           // 8405
  // 'TaskChangeLog',               // 0 Rows in production on 4/1/26
  'TaskDefinition',                 // 79
  'TaskDependency',                 // 0 Rows in production on 4/1/26
  'TaskGroup',                      // 50
  'TaskGroupTeamLink',              // 209
  'Team',                           // 44
  // 'TeamChangeLog',               // 0 Rows in production on 4/1/26
  // 'TeamGroup',                   // 0 Rows in production on 4/1/26
  'TeamMember',                     // 702
  // 'TeamMemberAway',              // 0 Rows in production on 4/1/26
  // 'TeamMemberFormer',            // 0 Rows in production on 4/1/26
  // 'TeamRole',                    // 0 Rows in production on 4/1/26
  // 'TeamRoleToPersonLink',        // 0 Rows in production on 4/1/26
  // 'TeamToTeamRoleLink',          // 0 Rows in production on 4/1/26
  // 'User',                        // Not used, should be surgically removed
  // '_prisma_migrations',          // no need to copy
  // 'session',                     // no value in copying the sessions table
  // 'QuestionnaireQuestionFormer', // Not used, should be removed from DB
];

exports.getAllowableTables = async (req, res) => res.json({
  allowableTables: this.allowableTables,
});
