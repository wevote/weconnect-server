// weconnect-server/controllers/taskController.js
const { createTask, findTaskDefinitionListByParams, findTaskDependencyListByParams, findTaskGroupListByIdList,
  findTaskListByParams, TASK_DEFINITION_FIELDS_ACCEPTED } = require('../models/taskModel');
const { arrayContains } = require('../utils/arrayContains');
const { findPersonListByParams } = require('../models/personModel');

exports.generateTaskStatusListForAllPeople = async () => {
  // Get all existing tasks
  const paramsTaskList = {};
  let status = '';
  let success = true;
  const taskList = await findTaskListByParams(paramsTaskList);
  const taskListDictByPersonId = {};
  for (let i = 0; i < taskList.length; i++) {
    // If task is not found, we create it
    if (!taskListDictByPersonId[taskList[i].personId]) {
      taskListDictByPersonId[taskList[i].personId] = [];
    }
    taskListDictByPersonId[taskList[i].personId].push(taskList[i]);
  }

  // Get all task definitions
  const paramsTaskDefinitionList = {};
  const taskDefinitionList = await findTaskDefinitionListByParams(paramsTaskDefinitionList);

  // Get all task dependencies
  const paramsTaskDependencyList = {};
  const taskDependencyList = await findTaskDependencyListByParams(paramsTaskDependencyList);

  // Add params that look for values in person records that imply tasks needs to be generated?
  const params = {};
  const personList = await findPersonListByParams(params);
  let taskListForPerson = [];
  for (let i = 0; i < personList.length; i++) {
    // console.log('personList[i]:', personList[i]);
    try {
      taskListForPerson = taskListDictByPersonId[personList[i].id] || [];
    } catch (err) {
      taskListForPerson = [];
    }
    const generateResults = exports.generateTasksForPerson(
      personList[i],
      taskListForPerson,
      taskDefinitionList,
    );
    status += generateResults.status;
    if (generateResults.success === false) {
      success = false;
    }
    if (generateResults.newTasksCreated) {
      ({ taskListForPerson } = generateResults);
      console.log('taskListModified:', taskListForPerson);
    }

    const taskListUpdated = exports.updateTaskStatusesForPerson(
      personList[i],
      taskListForPerson,
      taskDefinitionList,
      taskDependencyList,
    );
    // console.log('taskListUpdated:', taskListUpdated);
  }
  return {
    status,
    success,
  };
};

exports.generateTasksForPerson = async (
  person,
  taskListForPerson,
  taskDefinitionList,
) => {
  let newTasksCreated = false;
  let status = '';
  let success = true;
  // Organize tasks into a dict based on taskDefinitionId
  const taskDictByDefinitionId = {};
  for (let i = 0; i < taskListForPerson.length; i++) {
    if (!taskDictByDefinitionId[taskListForPerson[i].taskDefinitionId]) {
      taskDictByDefinitionId[taskListForPerson[i].taskDefinitionId] = taskListForPerson[i];
    }
  }
  // console.log('taskDictByDefinitionId:', taskDictByDefinitionId);
  // Loop through all TaskDefinitions and if a task doesn't already exist, create it
  // Create an array of promises for new tasks
  const newTaskPromises = taskDefinitionList.map((taskDefinition) => {
    if (!taskDictByDefinitionId[taskDefinition.id]) {
      console.log('Creating new task for person:', person.firstName);
      const taskChangeDict = {
        personId: person.id,
        taskDefinitionId: taskDefinition.id,
        taskGroupId: taskDefinition.taskGroupId,
      };
      // Set a flag to indicate that a new task has been created, so we don't try to create again
      taskDictByDefinitionId[taskDefinition.id] = true;
      return createTask(taskChangeDict);
    }
    return null;
  }).filter(Boolean);

  // Wait for all new tasks to be created
  const newTasks = await Promise.all(newTaskPromises);
  newTasksCreated = newTasks.length > 0;

  // Add new tasks to taskListForPerson and taskDictByDefinitionId
  newTasks.forEach((task) => {
    taskListForPerson.push(task);
    taskDictByDefinitionId[task.taskDefinitionId] = task;
  });

  // console.log('generateTasksForPerson taskListForPerson:', taskListForPerson);

  // Check dependencies and update task status

  // console.log('person.firstName:', person.firstName);
  return {
    status,
    success,
    newTasksCreated,
    taskListForPerson,
  };
};

exports.retrieveTaskStatusListByPersonIdList = async (personIdList) => {
  // const personAnswersByPersonId = {};
  let taskList = [];
  const taskDefinitionIdList = [];
  let taskDefinitionList = [];
  const taskGroupIdList = [];
  let taskGroupList = [];
  let status = '';
  let success = true;

  try {
    // To be moved
    await exports.generateTaskStatusListForAllPeople();
  } catch (err) {
    status += err.message;
    success = false;
  }
  // Start with the task data received for personIds in personIdList
  // console.log('personIdList:', personIdList);
  try {
    let params = {};
    if (personIdList && personIdList.length > 0) {
      params = {
        personId: { in: personIdList },
      };
    }
    taskList = await findTaskListByParams(params);
    success = true;
    // console.log('== AFTER findTaskListByParams taskList:', taskList);
    if (taskList) {
      status += 'TASK_LIST_FOUND ';
    } else {
      status += 'TASK_LIST_NOT_FOUND ';
    }
  } catch (err) {
    // console.log('=== Error retrieving findTaskListByParams:', err);
    status += err.message;
    success = false;
  }
  if (success && taskList.length > 0) {
    const keys = Object.keys(taskList);
    const values = Object.values(taskList);
    for (let i = 0; i < keys.length; i++) {
      // const onePersonId = values[i].personId;
      const oneTaskDefinitionId = values[i].taskDefinitionId;
      if (!arrayContains(oneTaskDefinitionId, taskGroupIdList)) {
        taskGroupIdList.push(oneTaskDefinitionId);
      }
      const oneTaskGroupId = values[i].taskGroupId;
      if (!arrayContains(oneTaskGroupId, taskGroupIdList)) {
        taskGroupIdList.push(oneTaskGroupId);
      }
    }
    // console.log('== AFTER findTaskListByParams taskGroupIdList:', taskGroupIdList);
  }

  if (success) {
    try {
      let params = {};
      if (taskDefinitionIdList && taskDefinitionIdList.length > 0) {
        params = {
          id: { in: taskDefinitionIdList },
        };
      }
      taskDefinitionList = await findTaskDefinitionListByParams(params);
      success = true;
      // console.log('== AFTER findTaskDefinitionListByParams taskDefinitionList:', taskDefinitionList);
      if (taskDefinitionList) {
        status += 'TASK_DEFINITION_LIST_FOUND ';
      } else {
        status += 'TASK_DEFINITION_LIST_NOT_FOUND ';
      }
    } catch (err) {
      // console.log('=== Error retrieving findTaskDefinitionListByParams:', err);
      status += err.message;
      success = false;
    }
  }

  // Retrieve the taskGroups so we can organize the tasks by taskGroup
  if (success && taskGroupIdList.length > 0) {
    try {
      taskGroupList = await findTaskGroupListByIdList(taskGroupIdList);
      success = true;
      // console.log('== AFTER findTaskGroupListByIdList taskGroupList:', taskGroupList);
      if (taskGroupList) {
        status += 'TASK_GROUP_LIST_FOUND ';
      } else {
        status += 'TASK_GROUP_LIST_NOT_FOUND ';
      }
    } catch (err) {
      // console.log('=== Error retrieving findTaskGroupListByIdList:', err);
      status += err.message;
      success = false;
    }
  }
  return {
    taskList,
    taskDefinitionList,
    taskGroupList,
    success,
    status,
  };
};

exports.updateTaskStatusesForPerson = async (
  person,
  taskListForPerson,
  taskDefinitionList,
  taskDependencyList,
) => {
  // console.log('updateTaskStatusesForPerson person.firstName:', person.firstName);
  // Organize tasks into a dict based on taskDefinitionId
  const taskDictByDefinitionId = {};
  for (let i = 0; i < taskListForPerson.length; i++) {
    if (!taskDictByDefinitionId[taskListForPerson[i].taskDefinitionId]) {
      taskDictByDefinitionId[taskListForPerson[i].taskDefinitionId] = taskListForPerson[i];
    }
  }
  // console.log('taskDictByDefinitionId:', taskDictByDefinitionId);

  // console.log('updateTaskStatusesForPerson taskListForPerson:', taskListForPerson);

  // Check dependencies and update task status

};
