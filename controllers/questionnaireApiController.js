// weconnect-server/controllers/questionnaireApiController.js
const bcrypt = require('@node-rs/bcrypt');
const { findOnePerson, PERSON_FIELDS_ACCEPTED_FROM_QUESTIONNAIRE, savePerson, createPerson } = require('../models/personModel');
const { retrieveQuestionnaireResponseListByPersonIdList } =  require('./questionnaireController');
const { createQuestion, createQuestionnaire, findQuestionListByIdList,
  findQuestionListByParams, findQuestionnaireById, findQuestionnaireListByParams,
  QUESTION_FIELDS_ACCEPTED, QUESTIONNAIRE_FIELDS_ACCEPTED,
  removeProtectedFieldsFromQuestion, removeProtectedFieldsFromQuestionnaire,
  saveQuestion, saveQuestionnaire, updateOrCreateQuestionAnswer } = require('../models/questionnaireModel');
const { extractQuestionAnswersFromIncomingParams, extractQuestionOrderDictFromIncomingParams, extractVariablesToChangeFromIncomingParams } = require('./dataTransformationUtils');
const { convertToInteger } = require('../utils/convertToInteger');
const { generateRandomString } = require('../utils/generateRandomString');
const { getAnswerValueFromAnswerDict } = require('../utils/getAnswerValueFromAnswerDict');
const { isValidUSStateCode } = require('../utils/stateUtils');


/**
 * GET /api/v1/answer-list-save
 *
 */
exports.answerListSave = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  let personId = convertToInteger(queryParams.get('personId'));
  const questionnaireId = convertToInteger(queryParams.get('questionnaireId'));
  let personUpdateDict = { id: personId };
  let personUpdatesFound = false;
  // console.log('answerListSave personId:', personId, ', questionnaireId:', questionnaireId);

  let answerListSaved = false;
  const answersSavedList = [];
  let stateCodeAlreadyExists = false;
  let status = '';
  let success = true;
  let requiredFieldsExist = true;

  if (!questionnaireId || questionnaireId === -1) {
    status += 'questionnaireId_MISSING ';
    requiredFieldsExist = false;
    success = false;
    console.log('answerListSave: missing questionnaireId');
  }

  const questionnaire = await findQuestionnaireById(questionnaireId);
  const isOfferQuestionnaire = questionnaire && questionnaire.isOfferQuestionnaire === true;
  const isCreatePersonQuestionnaire = questionnaire && questionnaire.isCreatePersonQuestionnaire === true;

  let personIdRequired = true;
  if (questionnaire && questionnaire.id) {
    personIdRequired = !(questionnaire.isCreatePersonQuestionnaire === true);
  } else {
    status += 'questionnaire_MISSING ';
    requiredFieldsExist = false;
    success = false;
    console.log('answerListSave: missing questionnaire');
  }

  if (personIdRequired && (!personId || personId === -1)) {
    status += 'personId_MISSING ';
    requiredFieldsExist = false;
    success = false;
    console.log('answerListSave: missing personId');
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

      // Cycle through the questions we expect answers to, clean the data, and put it into answerUpdateDict
      const answerUpdateDictByQuestionId = {};
      questionList.forEach((question) => {
        // console.log('== question:', question);
        const { answerType, fieldMappingRule, questionId, questionVersion } = question;
        if (questionId >= 0) {
          if (question.questionnaireId !== questionnaireId) {
            status += `Create answerUpdateDict questionnaireId_MISMATCH_FOR_QUESTION_ID_${questionId} `;
          } else {
            const answerValue = answerChangeDict[questionId];
            const answerUpdateDict = {
              questionId,
              questionnaireId,
              questionVersion,
            };
            if (personId) {
              answerUpdateDict.personId = personId;
            }
            if (answerType === 'INTEGER') {
              answerUpdateDict.answerInteger = convertToInteger(answerValue);
            } else if (answerType === 'BOOLEAN') {
              answerUpdateDict.answerBoolean = !!(answerValue);
            } else if (answerType === 'DATE') {
              const answerValueWithTime = (answerValue) ? `${answerValue}T12:00:00.000Z` : '';
              const parsedDate = new Date(answerValueWithTime);
              if (!Number.isNaN(parsedDate.getTime())) {
                answerUpdateDict.answerDateTime = parsedDate.toISOString();
              } else {
                // Invalid date
                console.warn(`Invalid date format for questionId ${questionId}: ${answerValue}`);
                answerUpdateDict.answerDateTime = null;
              }
            } else if (answerType === 'STRING') {
              answerUpdateDict.answerString = answerValue;
            } else {
              answerUpdateDict.answerString = answerValue;
            }
            answerUpdateDict.answerType = answerType;
            // console.log('=== answerUpdateDict:', answerUpdateDict);
            answerUpdateDictByQuestionId[questionId] = answerUpdateDict;
            try {
              // Now update the person field based on fieldMappingRule
              if (fieldMappingRule) {
                const fieldToUpdate = fieldMappingRule.split('.')[1];
                const answerValueTyped = getAnswerValueFromAnswerDict(answerUpdateDict);
                console.log('answerListSave fieldToUpdate:', fieldToUpdate, ', answerValueTyped:', answerValueTyped);
                if (fieldToUpdate in PERSON_FIELDS_ACCEPTED_FROM_QUESTIONNAIRE) {
                  console.log('fieldToUpdate (', fieldToUpdate, ') in PERSON_FIELDS_ACCEPTED_FROM_QUESTIONNAIRE');
                  personUpdateDict = {
                    ...personUpdateDict,
                    [fieldToUpdate]: answerValueTyped,
                  };
                  personUpdatesFound = true;
                } else {
                  console.log('fieldToUpdate (', fieldToUpdate, ') NOT in PERSON_FIELDS_ACCEPTED_FROM_QUESTIONNAIRE');
                }
              }
            } catch (err) {
              console.log('ERROR updating personUpdateDict: ', err);
            }
          }
        }
      });

      if (isCreatePersonQuestionnaire) {
        // emailPersonal and firstName are the only two required fields for creating a new person,
        // and if they weren't passed in, we create fake ones so we can create a new person
        let passwordAlreadyExists = false;
        personUpdatesFound = true;
        let personWithThisEmailExists = false;
        console.log('personUpdateDict at start of isCreatePersonQuestionnaire:', personUpdateDict);
        const randomUniqueId = generateRandomString(9);
        if (personUpdateDict.emailPersonal) {
          // Search the database to see if existing record
          try {
            // const params = { emailPersonal: { contains: personUpdateDict?.emailPersonal, mode: 'insensitive' } };
            // const params = personUpdateDict?.emailPersonal ? { emailPersonal: { equals: personUpdateDict.emailPersonal, mode: 'insensitive' } } : {};
            const params = { emailPersonal: personUpdateDict.emailPersonal };
            const personOnStage = await findOnePerson(params);
            if (personOnStage && personOnStage.id) {
              // console.log('Existing person found:', personOnStage);
              // Account already exists
              personId = personOnStage.id;
              personUpdateDict.id = personId;
              if (personOnStage.password) {
                passwordAlreadyExists = true;
              }
              if (personOnStage.stateCode && personOnStage.stateCode.length === 2 && isValidUSStateCode(personOnStage.stateCode)) {
                stateCodeAlreadyExists = true;
              }
              personWithThisEmailExists = true;
            } else {
              // Account does not exist, so leave emailPersonal in place so we can create a new account
              delete personUpdateDict.id;
              delete personUpdateDict.personId;
              // console.log('Existing person does NOT exist:', personUpdateDict);
            }
          } catch (err) {
            console.log('Error searching for existing person: ', err);
            // We can't guarantee the uniqueness of the emailPersonal, so alter it slightly
            personUpdateDict.emailPersonal = `confirm-${personUpdateDict.emailPersonal}`;
          }
        } else {
          // Generate a fake emailPersonal which can be adjusted later
          personUpdateDict.emailPersonal = `fake_email_${randomUniqueId}@weconnectfake.com`;
        }
        if (!personUpdateDict.firstName) {
          personUpdateDict.firstName = `fake_name_${randomUniqueId}`;
        }
        if (personUpdateDict.location && !personUpdateDict.stateCode && !stateCodeAlreadyExists) {
          const locationCleaned = personUpdateDict.location.trim();
          const stateCode = locationCleaned.split(', ')[1];
          if (stateCode && stateCode.length === 2 && isValidUSStateCode(stateCode)) {
            personUpdateDict.stateCode = stateCode.toUpperCase();
          }
        }
        if (passwordAlreadyExists) {
          // Do not update password
        } else if (personUpdateDict.password) {
          personUpdateDict.password = await bcrypt.hash(personUpdateDict.password, 10);
        } else {
          const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          personUpdateDict.password = await bcrypt.hash(tempPassword, 10);
        }
        //
        if (personWithThisEmailExists) {
          try {
            console.log('Updating existing person:', personUpdateDict);
            const person = await savePerson(personUpdateDict);
            personId = person.id;
          } catch (err) {
            console.log('Error saving existing person: ', err);
          }
        } else {
          personUpdateDict.statusActive = true;
          // For this routine, we need to set statusOfferDecisionNeeded to true for new accounts to indicate they need to be interviewed by a hiring manager.
          personUpdateDict.statusOfferDecisionNeeded = true;
          try {
            delete personUpdateDict.id;
            console.log('Creating new person:', personUpdateDict);
            const person = await createPerson(personUpdateDict);
            personId = person.id;
            personUpdateDict.id = personId;
            // Now loop through answerUpdateDictByQuestionId and add this new personId to answerUpdateDict
          } catch (err) {
            console.log('Error creating new person: ', err);
          }
        }
      }

      const saveQuestionAnswerPromises = questionList.map(async (question) => {
        // console.log('== question:', question);
        const { questionId } = question;
        const answerUpdateDict = answerUpdateDictByQuestionId[questionId];
        if (questionId >= 0 && answerUpdateDict && answerUpdateDict.questionnaireId === questionnaireId) {
          if (question.questionnaireId !== questionnaireId) {
            status += `saveQuestionAnswerPromises questionnaireId_MISMATCH_FOR_QUESTION_ID_${questionId} `;
          } else {
            try {
              // eslint-disable-next-line no-await-in-loop
              await updateOrCreateQuestionAnswer(personId, questionId, questionnaireId, answerUpdateDict);
              answersSavedList.push(answerUpdateDict);
              return true;
            } catch (err) {
              console.log('ERROR saving answer: ', err);
              status += `ERROR_SAVING_ANSWER_FOR_QUESTION_ID: ${questionId}: ${err}`;
              return false;
            }
          }
        }
        return false;
      });

      const results = await Promise.all(saveQuestionAnswerPromises);
      answerListSaved = results.some((result) => result);
      status += `QUESTIONS_ANSWERED: ${answerListSaved ? 'YES' : 'NO'} `;
    } else {
      status += 'NO_QUESTIONS_FOUND ';
    }
  }

  // If QuestionAnswers were successfully saved, and the Questionnaire is labeled as isOfferQuestionnaire,
  // mark person.statusOfferQuestionnaireAnswered
  // console.log('answerListSave questionnaire:', questionnaire);
  if (answerListSaved && questionnaire && isOfferQuestionnaire) {
    personUpdateDict = {
      ...personUpdateDict,
      statusOfferQuestionnaireAnswered: true,
    };
    personUpdatesFound = true;
    // console.log('answerListSave person.statusOfferQuestionnaireAnswered personUpdateDict:', personUpdateDict);
    status += `personUpdateDict_TO_BE_SAVED: ${JSON.stringify(personUpdateDict)} `;
  } else {
    status += `QUESTIONNAIRE_IS_NOT_OFFER_QUESTIONNAIRE_OR not answerListSaved: ${answerListSaved}`;
  }

  console.log('answerListSave personUpdatesFound:', personUpdatesFound, ', personUpdateDict:', personUpdateDict);
  if (personUpdatesFound) {
    try {
      await savePerson(personUpdateDict);
      status += 'PERSON_SAVED ';
    } catch (err) {
      console.error('ERROR saving person: ', err);
      status += `ERROR_SAVING_PERSON: ${err} `;
      success = false;
    }
  } else {
    status += 'NO_PERSON_UPDATES_FOUND ';
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
        { questionText: { contains: searchText, mode: 'insensitive' } },
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
 * GET /api/v1/question-list-save
 * For now, we are only saving the questionOrder value
 *
 */
exports.questionListSave = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const questionnaireId = convertToInteger(queryParams.get('questionnaireId'));

  let status = '';
  const success = true;
  const requiredFieldsExist = true;

  if (success && requiredFieldsExist) {
    // key is questionId
    const questionChangeDict = extractQuestionOrderDictFromIncomingParams(queryParams);
    // console.log('questionChangeDict:', questionChangeDict);

    // Create questionIdList so we can cycle through questions to save
    const questionIdKeys = Object.keys(questionChangeDict);
    // console.log('questionIdKeys:', questionIdKeys);
    const saveQuestionPromises = questionIdKeys.map(async (questionIdString) => {
      const questionId = convertToInteger(questionIdString);
      const questionOrderString = questionChangeDict[questionId];
      const questionOrder = convertToInteger(questionOrderString);
      // console.log('== questionOrder:', questionOrder);
      // const {answerType, fieldMappingRule, questionId, questionVersion} = question;
      if (questionId > 0) {
        const questionUpdateDict = {
          id: questionId,
          questionOrder,
        };
        // console.log('=== questionUpdateDict:', questionUpdateDict);
        try {
          // eslint-disable-next-line no-await-in-loop
          await saveQuestion(questionUpdateDict);
          return `question saved for questionId: ${questionId}`;
        } catch (err) {
          console.log('ERROR saving answer: ', err);
          return `ERROR_SAVING_ANSWER_FOR_QUESTION_ID: ${questionId}: ${err}`;
        }
      }
      return null;
    });

    const results = await Promise.all(saveQuestionPromises);
    status += results.filter(Boolean).join(' ');
  }

  // Set up the default JSON response.
  const jsonData = {
    questionnaireId: -1,
    status,
    success,
  };
  try {
    jsonData.questionnaireId = questionnaireId;
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
 * TODO: I am considering refactoring this to be answer-list-retrieve and not return questionList or questionnaireList.
 */
exports.questionnaireResponsesListRetrieve = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  // console.log('questionnaireResponsesListRetrieve queryParams:', queryParams);
  const personIdListIncoming = queryParams.getAll('personIdList[]');
  const personIdList = personIdListIncoming.map(convertToInteger);
  // console.log('=== questionnaireResponsesListRetrieve personIdList:', personIdList);

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
  // console.log('questionSave queryParams:', queryParams);
  const questionId = convertToInteger(queryParams.get('questionId'));
  const questionnaireId = convertToInteger(queryParams.get('questionnaireId'));
  // console.log('queryParams:', queryParams);
  const questionChangeDict = extractVariablesToChangeFromIncomingParams(queryParams, QUESTION_FIELDS_ACCEPTED);
  if (questionChangeDict.answerType && questionChangeDict.answerType.includes()) {
    // Consider adding a filter to ensure the answerType is one of the accepted types.
  }
  // console.log('questionSave questionChangeDict:', questionChangeDict);
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
