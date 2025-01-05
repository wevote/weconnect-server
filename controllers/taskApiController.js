// weconnect-server/controllers/taskApiController.js
// const { retrieveTaskGroupResponseListByPersonIdList, saveAnswerToMappedField } =  require('./taskController');
const { createTaskDefinition, createTaskGroup,
  findTaskDefinitionListByParams, findTaskGroupById, findTaskGroupListByParams,
  TASK_DEFINITION_FIELDS_ACCEPTED, TASK_GROUP_FIELDS_ACCEPTED,
  removeProtectedFieldsFromTaskDefinition, removeProtectedFieldsFromTaskGroup,
  saveTaskDefinition, saveTaskGroup } = require('../models/taskModel');
const { extractVariablesToChangeFromIncomingParams } = require('./dataTransformationUtils');
const { convertToInteger } = require('../utils/convertToInteger');

/**
 * GET /api/v1/task-definition-list-retrieve
 * Retrieve a list of TaskDefinitions for one TaskGroup.
 */
exports.taskDefinitionListRetrieve = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const taskGroupId = convertToInteger(queryParams.get('taskGroupId'));
  const searchText = queryParams.get('searchText');

  const jsonData = {
    isSearching: false,
    taskDefinitionList: [],
    status: '',
    success: true,
  };
  try {
    const params = {
      taskGroupId,
    };
    if (searchText) {
      jsonData.isSearching = true;
      params.OR = [
        { taskDefinitionInstructions: { contains: searchText, mode: 'insensitive' } },
        { taskDefinitionText: { contains: searchText, mode: 'insensitive' } },
      ];
    }
    const taskDefinitionList = await findTaskDefinitionListByParams(params);
    jsonData.success = true;
    if (taskDefinitionList) {
      jsonData.taskDefinitionList = taskDefinitionList;
      jsonData.status += 'TASK_DEFINITION_LIST_FOUND ';
    } else {
      jsonData.status += 'TASK_DEFINITION_LIST_NOT_FOUND ';
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }
  response.json(jsonData);
};

/**
 * GET /api/v1/task-group-list-retrieve
 * Retrieve a list of taskGroups.
 */
exports.taskGroupListRetrieve = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const searchText = queryParams.get('searchText');

  const jsonData = {
    isSearching: false,
    taskGroupList: [],
    status: '',
    success: true,
  };
  try {
    const params = {};
    if (searchText) {
      jsonData.isSearching = true;
      params.OR = [
        { taskGroupName: { contains: searchText, mode: 'insensitive' } },
        { taskGroupDescription: { contains: searchText, mode: 'insensitive' } },
      ];
    }
    const taskGroupList = await findTaskGroupListByParams(params);
    jsonData.success = true;
    if (taskGroupList) {
      jsonData.taskGroupList = taskGroupList;
      jsonData.status += 'TASK_GROUP_LIST_FOUND ';
    } else {
      jsonData.status += 'TASK_GROUP_LIST_NOT_FOUND ';
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }
  response.json(jsonData);
};

/**
 * GET /api/v1/task-list-retrieve
 * Retrieve a list of tasks.
 */
exports.taskListRetrieve = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  // console.log('queryParams:', queryParams);
  const personIdListIncoming = queryParams.getAll('personIdList[]');
  const personIdList = personIdListIncoming.map(convertToInteger);
  console.log('taskListRetrieve personIdList:', personIdList);
  // const personId = convertToInteger(queryParams.get('personId'));

  const jsonData = {
    isSearching: false,
    taskList: [],
    taskDefinitionList: [],
    taskGroupList: [],
    status: '',
    success: true,
  };
  try {
    // console.log('taskListRetrieve personIdList:', personIdList);
    // const results = await retrieveTaskResponseListByPersonIdList(personIdList);
    const results = {};
    // console.log('results:', results);
    jsonData.success = true;
    jsonData.taskList = results.taskList;
    jsonData.taskDefinitionList = results.taskDefinitionList;
    jsonData.taskGroupList = results.taskGroupList;
    jsonData.status += results.status;
  } catch (err) {
    console.log('taskListRetrieve err:', err);
    jsonData.status += err.message;
    jsonData.success = false;
  }
  response.json(jsonData);
};

/**
 * GET /api/v1/task-group-retrieve
 * Retrieve one taskGroup.
 */
exports.taskGroupRetrieve = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const taskGroupId = convertToInteger(queryParams.get('taskGroupId'));
  const searchText = queryParams.get('searchText');

  const jsonData = {
    status: '',
    success: true,
  };
  try {
    const params = {};
    if (searchText) {
      jsonData.isSearching = true;
      params.OR = [
        { taskGroupInstructions: { contains: searchText, mode: 'insensitive' } },
        { taskGroupName: { contains: searchText, mode: 'insensitive' } },
      ];
    }
    const taskGroup = await findTaskGroupById(taskGroupId);
    jsonData.success = true;
    if (taskGroup) {
      jsonData.taskGroupId = taskGroup.id;
      const keys = Object.keys(taskGroup);
      const values = Object.values(taskGroup);
      for (let i = 0; i < keys.length; i++) {
        jsonData[keys[i]] = values[i];
      }
      jsonData.status += 'TASK_GROUP_FOUND ';
    } else {
      jsonData.status += 'TASK_GROUP_NOT_FOUND ';
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }
  response.json(jsonData);
};

/**
 * GET /api/v1/task-group-save
 *
 */
exports.taskGroupSave = async (request, response) => {
  let shouldCreateTaskGroup = false;
  let shouldUpdateTaskGroup = false;

  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const taskGroupId = convertToInteger(queryParams.get('taskGroupId'));
  const taskGroupChangeDict = extractVariablesToChangeFromIncomingParams(queryParams, TASK_GROUP_FIELDS_ACCEPTED);
  // Set up the default JSON response.
  const jsonData = {
    taskGroupCreated: false,
    taskGroupId: -1,
    taskGroupUpdated: false,
    status: '',
    success: true,
    updateErrors: [],
  };
  try {
    jsonData.taskGroupId = taskGroupId;
    jsonData.success = true;
    const keys = Object.keys(taskGroupChangeDict);
    const values = Object.values(taskGroupChangeDict);
    for (let i = 0; i < keys.length; i++) {
      jsonData[keys[i]] = values[i];
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }

  try {
    let requiredFieldsExist = true;
    if (taskGroupId < 0) {
      if (!taskGroupChangeDict.taskGroupName || taskGroupChangeDict.taskGroupName.length === 0) {
        jsonData.status += 'taskGroupName_MISSING ';
        requiredFieldsExist = false;
      }
    }

    if (taskGroupId >= 0) {
      jsonData.status += 'TASK_GROUP_ID_FOUND ';
      shouldUpdateTaskGroup = requiredFieldsExist;
    } else {
      jsonData.status += 'TASK_GROUP_TO_BE_CREATED ';
      shouldCreateTaskGroup = requiredFieldsExist;
    }

    if (shouldCreateTaskGroup) {
      const taskGroup = await createTaskGroup(taskGroupChangeDict);
      // taskGroupId = taskGroup.id;
      // console.log('Created new taskGroup:', taskGroup);
      jsonData.taskGroupCreated = true;
      jsonData.taskGroupId = taskGroup.id;
      jsonData.status += 'TASK_GROUP_CREATED ';
      const modifiedTaskGroupDict = removeProtectedFieldsFromTaskGroup(taskGroup);
      const taskGroupKeys = Object.keys(modifiedTaskGroupDict);
      const taskGroupValues = Object.values(modifiedTaskGroupDict);
      for (let i = 0; i < taskGroupKeys.length; i++) {
        jsonData[taskGroupKeys[i]] = taskGroupValues[i];
      }
    } else if (shouldUpdateTaskGroup) {
      taskGroupChangeDict.id = taskGroupId;
      // console.log('Updating taskGroup:', taskGroupChangeDict);
      const taskGroup = await saveTaskGroup(taskGroupChangeDict);
      jsonData.taskGroupUpdated = true;
      jsonData.taskGroupId = taskGroupId;
      jsonData.status += 'TASK_GROUP_UPDATED ';
      const modifiedTaskGroupDict = removeProtectedFieldsFromTaskGroup(taskGroup);
      const taskGroupKeys = Object.keys(modifiedTaskGroupDict);
      const taskGroupValues = Object.values(modifiedTaskGroupDict);
      for (let i = 0; i < taskGroupKeys.length; i++) {
        jsonData[taskGroupKeys[i]] = taskGroupValues[i];
      }
    }
  } catch (err) {
    console.error('Error while saving taskGroup:', err);
    jsonData.status += err.message;
    jsonData.success = false;
  }

  response.json(jsonData);
};

/**
 * GET /api/v1/task-definition-save
 *
 */
exports.taskDefinitionSave = async (request, response) => {
  let shouldCreateTaskDefinition = false;
  let shouldUpdateTaskDefinition = false;

  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const taskDefinitionId = convertToInteger(queryParams.get('taskDefinitionId'));
  const taskGroupId = convertToInteger(queryParams.get('taskGroupId'));
  // console.log('queryParams:', queryParams);
  const taskDefinitionChangeDict = extractVariablesToChangeFromIncomingParams(queryParams, TASK_DEFINITION_FIELDS_ACCEPTED);
  // console.log('taskDefinitionChangeDict:', taskDefinitionChangeDict);
  // Set up the default JSON response.
  const jsonData = {
    taskDefinitionCreated: false,
    taskDefinitionId: -1,
    taskGroupId: -1,
    taskDefinitionUpdated: false,
    status: '',
    success: true,
    updateErrors: [],
  };
  try {
    jsonData.taskGroupId = taskGroupId;
    jsonData.taskDefinitionId = taskDefinitionId;
    jsonData.success = true;
    const keys = Object.keys(taskDefinitionChangeDict);
    const values = Object.values(taskDefinitionChangeDict);
    for (let i = 0; i < keys.length; i++) {
      jsonData[keys[i]] = values[i];
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }

  try {
    if (taskDefinitionId >= 0) {
      jsonData.status += 'TASK_DEFINITION_ID_FOUND ';
      shouldUpdateTaskDefinition = true;
    } else {
      jsonData.status += 'TASK_DEFINITION_TO_BE_CREATED ';
      shouldCreateTaskDefinition = true;
    }

    let requiredFieldsExist = true;
    if (!taskGroupId || taskGroupId === -1) {
      jsonData.status += 'taskGroupId_MISSING ';
      requiredFieldsExist = false;
    }
    if (shouldCreateTaskDefinition) {
      if (!taskDefinitionChangeDict.taskName || taskDefinitionChangeDict.taskName.length === 0) {
        jsonData.status += 'taskName_MISSING ';
        requiredFieldsExist = false;
      }
    }

    if (!requiredFieldsExist) {
      shouldCreateTaskDefinition = false;
      shouldUpdateTaskDefinition = false;
    }

    if (shouldCreateTaskDefinition) {
      //
      taskDefinitionChangeDict.taskGroupId = taskGroupId;
      const taskDefinition = await createTaskDefinition(taskDefinitionChangeDict);
      // taskDefinitionId = taskDefinition.id;
      // console.log('Created new taskDefinition:', taskDefinition);
      jsonData.taskDefinitionCreated = true;
      jsonData.taskDefinitionId = taskDefinition.id;
      jsonData.status += 'TASK_DEFINITION_CREATED ';
      const modifiedTaskDefinitionDict = removeProtectedFieldsFromTaskDefinition(taskDefinition);
      const taskDefinitionKeys = Object.keys(modifiedTaskDefinitionDict);
      const taskDefinitionValues = Object.values(modifiedTaskDefinitionDict);
      for (let i = 0; i < taskDefinitionKeys.length; i++) {
        jsonData[taskDefinitionKeys[i]] = taskDefinitionValues[i];
      }
    } else if (shouldUpdateTaskDefinition) {
      taskDefinitionChangeDict.id = taskDefinitionId;
      // console.log('Updating taskDefinition:', taskDefinitionChangeDict);
      const taskDefinition = await saveTaskDefinition(taskDefinitionChangeDict);
      // console.log('=== Updated taskDefinition:', taskDefinition);
      jsonData.taskDefinitionUpdated = true;
      jsonData.taskDefinitionId = taskDefinitionId;
      jsonData.status += 'TASK_DEFINITION_UPDATED ';
      const modifiedTaskDefinitionDict = removeProtectedFieldsFromTaskDefinition(taskDefinition);
      const taskDefinitionKeys = Object.keys(modifiedTaskDefinitionDict);
      const taskDefinitionValues = Object.values(modifiedTaskDefinitionDict);
      for (let i = 0; i < taskDefinitionKeys.length; i++) {
        jsonData[taskDefinitionKeys[i]] = taskDefinitionValues[i];
      }
    }
  } catch (err) {
    console.error('Error while saving taskDefinition:', err);
    jsonData.status += err.message;
    jsonData.success = false;
  }

  response.json(jsonData);
};
