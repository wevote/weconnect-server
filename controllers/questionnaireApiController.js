// weconnect-server/controllers/questionnaireApiController.js
const { retrieveQuestionnaireResponseListByPersonIdList } =  require('./questionnaireControllers');
const { createQuestion, createQuestionnaire, findQuestionListByIdList,
  findQuestionListByParams, findQuestionnaireById, findQuestionnaireListByParams,
  QUESTION_FIELDS_ACCEPTED, QUESTIONNAIRE_FIELDS_ACCEPTED,
  removeProtectedFieldsFromQuestion, removeProtectedFieldsFromQuestionnaire,
  saveQuestion, saveQuestionnaire, updateOrCreateQuestionAnswer } = require('../models/questionnaireModel');
const { extractQuestionAnswersFromIncomingParams, extractVariablesToChangeFromIncomingParams } = require('./dataTransformationUtils');
const { convertToInteger } = require('../utils/convertToInteger');


/**
 * GET /api/v1/answer-list-save
 *
 */
exports.answerListSave = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const personId = convertToInteger(queryParams.get('personId'));
  // const questionId = convertToInteger(queryParams.get('questionId'));
  const questionnaireId = convertToInteger(queryParams.get('questionnaireId'));
  // console.log('queryParams:', queryParams);

  let answerListSaved = false;
  const answersSavedList = [];
  let status = '';
  let success = true;
  let requiredFieldsExist = true;
  if (!personId || personId === -1) {
    status += 'personId_MISSING ';
    requiredFieldsExist = false;
    success = false;
  }

  if (success && requiredFieldsExist) {
    const answerChangeDict = extractQuestionAnswersFromIncomingParams(queryParams);
    // console.log('answerChangeDict:', answerChangeDict);

    // Retrieve all the questions, so we know the expected answerType, questionVersion
    const questionIdKeys = Object.keys(answerChangeDict);
    const questionIdList = [];
    for (let i = 0; i < questionIdKeys.length; i++) {
      // Convert them to integers
      const questionId = convertToInteger(questionIdKeys[i]);
      questionIdList.push(questionId);
    }

    // Validate the answerType and questionVersion
    // console.log('questionIdList:', questionIdList);
    if (questionIdList.length > 0) {
      const questionList = await findQuestionListByIdList(questionIdList);

      // Now cycle through the questions we expect answers to
      // eslint-disable-next-line no-restricted-syntax
      for (const question of questionList) {
        // console.log('== question:', question);
        const { answerType, questionId, questionVersion } = question;
        if (questionId >= 0) {
          if (question.questionnaireId !== questionnaireId) {
            status += `questionnaireId_MISMATCH_FOR_QUESTION_ID_${questionId} `;
          } else {
            const answerValue = answerChangeDict[questionId];
            const updateDict = {
              personId,
              questionId,
              questionnaireId,
              questionVersion,
            };
            if (answerType === 'INTEGER') {
              updateDict.answerInteger = convertToInteger(answerValue);
            } else if (answerType === 'BOOLEAN') {
              updateDict.answerBoolean = !!(answerValue);
            } else if (answerType === 'STRING') {
              updateDict.answerString = answerValue;
            } else {
              updateDict.answerString = answerValue;
            }
            updateDict.answerType = answerType;
            // console.log('=== updateDict:', updateDict);
            try {
              // eslint-disable-next-line no-await-in-loop
              await updateOrCreateQuestionAnswer(personId, questionId, questionnaireId, updateDict);
              answersSavedList.push(updateDict);
              answerListSaved = true;
            } catch (err) {
              console.log('ERROR saving answer: ', err);
              status += `ERROR_SAVING_ANSWER_FOR_QUESTION_ID: ${questionId}: ${err}`;
            }
          }
        }
      }
    }
  }

  // Set up the default JSON response.
  const jsonData = {
    answerListSaved,
    answersSavedList,
    personId: -1,
    questionnaireId: -1,
    status,
    success,
    updateErrors: [],
  };
  try {
    jsonData.questionnaireId = questionnaireId;
    jsonData.personId = personId;
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }

  response.json(jsonData);
};


/**
 * GET /api/v1/question-list-retrieve
 * Retrieve a list of questions for one questionnaire.
 */
exports.questionListRetrieve = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const questionnaireId = convertToInteger(queryParams.get('questionnaireId'));
  const searchText = queryParams.get('searchText');

  const jsonData = {
    isSearching: false,
    questionList: [],
    status: '',
    success: true,
  };
  try {
    const params = {
      questionnaireId,
    };
    if (searchText) {
      jsonData.isSearching = true;
      params.OR = [
        { questionInstructions: { contains: searchText, mode: 'insensitive' } },
        { questionDText: { contains: searchText, mode: 'insensitive' } },
      ];
    }
    const questionList = await findQuestionListByParams(params);
    jsonData.success = true;
    if (questionList) {
      jsonData.questionList = questionList;
      jsonData.status += 'QUESTION_LIST_FOUND ';
    } else {
      jsonData.status += 'QUESTION_LIST_NOT_FOUND ';
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }
  response.json(jsonData);
};

/**
 * GET /api/v1/questionnaire-list-retrieve
 * Retrieve a list of questionnaires.
 */
exports.questionnaireListRetrieve = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const searchText = queryParams.get('searchText');

  const jsonData = {
    isSearching: false,
    questionnaireList: [],
    status: '',
    success: true,
  };
  try {
    const params = {};
    if (searchText) {
      jsonData.isSearching = true;
      params.OR = [
        { questionnaireInstructions: { contains: searchText, mode: 'insensitive' } },
        { questionnaireName: { contains: searchText, mode: 'insensitive' } },
      ];
    }
    const questionnaireList = await findQuestionnaireListByParams(params);
    jsonData.success = true;
    if (questionnaireList) {
      jsonData.questionnaireList = questionnaireList;
      jsonData.status += 'QUESTIONNAIRE_LIST_FOUND ';
    } else {
      jsonData.status += 'QUESTIONNAIRE_LIST_NOT_FOUND ';
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }
  response.json(jsonData);
};

/**
 * GET /api/v1/questionnaire-responses-list-retrieve
 * Retrieve a list of responses to questionnaire questions.
 */
exports.questionnaireResponsesListRetrieve = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  // console.log('queryParams:', queryParams);
  const personIdListIncoming = queryParams.getAll('personIdList[]');
  const personIdList = personIdListIncoming.map(convertToInteger);
  // const personId = convertToInteger(queryParams.get('personId'));

  const jsonData = {
    isSearching: false,
    questionAnswerList: [],
    questionList: [],
    questionnaireList: [],
    status: '',
    success: true,
  };
  try {
    // console.log('questionnaireResponsesListRetrieve personIdList:', personIdList);
    const results = await retrieveQuestionnaireResponseListByPersonIdList(personIdList);
    // console.log('results:', results);
    jsonData.success = true;
    jsonData.questionAnswerList = results.questionAnswerList;
    jsonData.questionList = results.questionList;
    jsonData.questionnaireList = results.questionnaireList;
    jsonData.status += results.status;
  } catch (err) {
    console.log('questionnaireResponsesListRetrieve err:', err);
    jsonData.status += err.message;
    jsonData.success = false;
  }
  response.json(jsonData);
};

/**
 * GET /api/v1/questionnaire-retrieve
 * Retrieve one questionnaire.
 */
exports.questionnaireRetrieve = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const questionnaireId = convertToInteger(queryParams.get('questionnaireId'));
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
        { questionnaireInstructions: { contains: searchText, mode: 'insensitive' } },
        { questionnaireName: { contains: searchText, mode: 'insensitive' } },
      ];
    }
    const questionnaire = await findQuestionnaireById(questionnaireId);
    jsonData.success = true;
    if (questionnaire) {
      jsonData.questionnaireId = questionnaire.id;
      const keys = Object.keys(questionnaire);
      const values = Object.values(questionnaire);
      for (let i = 0; i < keys.length; i++) {
        jsonData[keys[i]] = values[i];
      }
      jsonData.status += 'QUESTIONNAIRE_FOUND ';
    } else {
      jsonData.status += 'QUESTIONNAIRE_NOT_FOUND ';
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }
  response.json(jsonData);
};

/**
 * GET /api/v1/questionnaire-save
 *
 */
exports.questionnaireSave = async (request, response) => {
  let shouldCreateQuestionnaire = false;
  let shouldUpdateQuestionnaire = false;

  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const questionnaireId = convertToInteger(queryParams.get('questionnaireId'));
  const questionnaireChangeDict = extractVariablesToChangeFromIncomingParams(queryParams, QUESTIONNAIRE_FIELDS_ACCEPTED);
  // Set up the default JSON response.
  const jsonData = {
    questionnaireCreated: false,
    questionnaireId: -1,
    questionnaireUpdated: false,
    status: '',
    success: true,
    updateErrors: [],
  };
  try {
    jsonData.questionnaireId = questionnaireId;
    jsonData.success = true;
    const keys = Object.keys(questionnaireChangeDict);
    const values = Object.values(questionnaireChangeDict);
    for (let i = 0; i < keys.length; i++) {
      jsonData[keys[i]] = values[i];
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }

  try {
    let requiredFieldsExist = true;
    if (questionnaireId < 0) {
      if (!questionnaireChangeDict.questionnaireName || questionnaireChangeDict.questionnaireName.length === 0) {
        jsonData.status += 'questionnaireName_MISSING ';
        requiredFieldsExist = false;
      }
    }

    if (questionnaireId >= 0) {
      jsonData.status += 'QUESTIONNAIRE_ID_FOUND ';
      shouldUpdateQuestionnaire = requiredFieldsExist;
    } else {
      jsonData.status += 'QUESTIONNAIRE_TO_BE_CREATED ';
      shouldCreateQuestionnaire = requiredFieldsExist;
    }

    if (shouldCreateQuestionnaire) {
      const questionnaire = await createQuestionnaire(questionnaireChangeDict);
      // questionnaireId = questionnaire.id;
      // console.log('Created new questionnaire:', questionnaire);
      jsonData.questionnaireCreated = true;
      jsonData.questionnaireId = questionnaire.id;
      jsonData.status += 'QUESTIONNAIRE_CREATED ';
      const modifiedQuestionnaireDict = removeProtectedFieldsFromQuestionnaire(questionnaire);
      const questionnaireKeys = Object.keys(modifiedQuestionnaireDict);
      const questionnaireValues = Object.values(modifiedQuestionnaireDict);
      for (let i = 0; i < questionnaireKeys.length; i++) {
        jsonData[questionnaireKeys[i]] = questionnaireValues[i];
      }
    } else if (shouldUpdateQuestionnaire) {
      questionnaireChangeDict.id = questionnaireId;
      // console.log('Updating questionnaire:', questionnaireChangeDict);
      const questionnaire = await saveQuestionnaire(questionnaireChangeDict);
      jsonData.questionnaireUpdated = true;
      jsonData.questionnaireId = questionnaireId;
      jsonData.status += 'QUESTIONNAIRE_UPDATED ';
      const modifiedQuestionnaireDict = removeProtectedFieldsFromQuestionnaire(questionnaire);
      const questionnaireKeys = Object.keys(modifiedQuestionnaireDict);
      const questionnaireValues = Object.values(modifiedQuestionnaireDict);
      for (let i = 0; i < questionnaireKeys.length; i++) {
        jsonData[questionnaireKeys[i]] = questionnaireValues[i];
      }
    }
  } catch (err) {
    console.error('Error while saving questionnaire:', err);
    jsonData.status += err.message;
    jsonData.success = false;
  }

  response.json(jsonData);
};

/**
 * GET /api/v1/question-save
 *
 */
exports.questionSave = async (request, response) => {
  let shouldCreateQuestion = false;
  let shouldUpdateQuestion = false;

  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const questionId = convertToInteger(queryParams.get('questionId'));
  const questionnaireId = convertToInteger(queryParams.get('questionnaireId'));
  // console.log('queryParams:', queryParams);
  const questionChangeDict = extractVariablesToChangeFromIncomingParams(queryParams, QUESTION_FIELDS_ACCEPTED);
  if (questionChangeDict.answerType && questionChangeDict.answerType.includes()) {
    // Consider adding a filter to ensure the answerType is one of the accepted types.
  }
  // console.log('questionChangeDict:', questionChangeDict);
  // Set up the default JSON response.
  const jsonData = {
    questionCreated: false,
    questionId: -1,
    questionnaireId: -1,
    questionUpdated: false,
    status: '',
    success: true,
    updateErrors: [],
  };
  try {
    jsonData.questionnaireId = questionnaireId;
    jsonData.questionId = questionId;
    jsonData.success = true;
    const keys = Object.keys(questionChangeDict);
    const values = Object.values(questionChangeDict);
    for (let i = 0; i < keys.length; i++) {
      jsonData[keys[i]] = values[i];
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }

  try {
    if (questionId >= 0) {
      jsonData.status += 'QUESTION_ID_FOUND ';
      shouldUpdateQuestion = true;
    } else {
      jsonData.status += 'QUESTION_TO_BE_CREATED ';
      shouldCreateQuestion = true;
    }

    let requiredFieldsExist = true;
    if (!questionnaireId || questionnaireId === -1) {
      jsonData.status += 'questionnaireId_MISSING ';
      requiredFieldsExist = false;
    }
    if (shouldCreateQuestion) {
      if (!questionChangeDict.questionText || questionChangeDict.questionText.length === 0) {
        jsonData.status += 'questionText_MISSING ';
        requiredFieldsExist = false;
      }
    }

    if (!requiredFieldsExist) {
      shouldCreateQuestion = false;
      shouldUpdateQuestion = false;
    }

    if (shouldCreateQuestion) {
      //
      questionChangeDict.questionnaireId = questionnaireId;
      const question = await createQuestion(questionChangeDict);
      // questionId = question.id;
      // console.log('Created new question:', question);
      jsonData.questionCreated = true;
      jsonData.questionId = question.id;
      jsonData.status += 'QUESTION_CREATED ';
      const modifiedQuestionDict = removeProtectedFieldsFromQuestion(question);
      const questionKeys = Object.keys(modifiedQuestionDict);
      const questionValues = Object.values(modifiedQuestionDict);
      for (let i = 0; i < questionKeys.length; i++) {
        jsonData[questionKeys[i]] = questionValues[i];
      }
    } else if (shouldUpdateQuestion) {
      questionChangeDict.id = questionId;
      // console.log('Updating question:', questionChangeDict);
      const question = await saveQuestion(questionChangeDict);
      // console.log('=== Updated question:', question);
      jsonData.questionUpdated = true;
      jsonData.questionId = questionId;
      jsonData.status += 'QUESTION_UPDATED ';
      const modifiedQuestionDict = removeProtectedFieldsFromQuestion(question);
      const questionKeys = Object.keys(modifiedQuestionDict);
      const questionValues = Object.values(modifiedQuestionDict);
      for (let i = 0; i < questionKeys.length; i++) {
        jsonData[questionKeys[i]] = questionValues[i];
      }
    }
  } catch (err) {
    console.error('Error while saving question:', err);
    jsonData.status += err.message;
    jsonData.success = false;
  }

  response.json(jsonData);
};
