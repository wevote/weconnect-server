// weconnect-server/controllers/questionnaireController.js
const { PERSON_FIELDS_ACCEPTED, savePerson } = require('../models/personModel');
const { findQuestionAnswerListByParams, findQuestionListByParams, findQuestionnaireListByIdList } = require('../models/questionnaireModel');
const { arrayContains } = require('../utils/arrayContains');

exports.retrieveQuestionnaireResponseListByPersonIdList = async (personIdList) => {
  // const personAnswersByPersonId = {};
  let questionAnswerList = [];
  let questionList = [];
  const questionnaireIdList = [];
  let questionnaireList = [];
  let status = '';
  let success = true;

  // Start with the questionAnswer data received for personIds in personIdList
  // console.log('personIdList:', personIdList);
  try {
    const params = {
      personId: { in: personIdList },
    };
    questionAnswerList = await findQuestionAnswerListByParams(params);
    success = true;
    // console.log('== AFTER findQuestionAnswerListByParams questionAnswerList:', questionAnswerList);
    if (questionAnswerList) {
      status += 'QUESTION_ANSWER_LIST_FOUND ';
    } else {
      status += 'QUESTION_ANSWER_LIST_NOT_FOUND ';
    }
  } catch (err) {
    // console.log('=== Error retrieving findQuestionAnswerListByParams:', err);
    status += err.message;
    success = false;
  }
  if (success && questionAnswerList.length > 0) {
    const keys = Object.keys(questionAnswerList);
    const values = Object.values(questionAnswerList);
    for (let i = 0; i < keys.length; i++) {
      // const onePersonId = values[i].personId;
      const oneQuestionnaireId = values[i].questionnaireId;
      if (!arrayContains(oneQuestionnaireId, questionnaireIdList)) {
        questionnaireIdList.push(oneQuestionnaireId);
      }
      // if (!(onePersonId in personAnswersByPersonId)) {
      //   personAnswersByPersonId[onePersonId] = [];
      // }
    }
    // console.log('== AFTER findQuestionAnswerListByParams questionnaireIdList:', questionnaireIdList);
  }

  // Get the list of questions so we know what the person is answering
  if (success && questionnaireIdList.length > 0) {
    try {
      const params = {
        questionnaireId: { in: questionnaireIdList },
      };
      questionList = await findQuestionListByParams(params);
      success = true;
      // console.log('== AFTER findQuestionListByParams questionList:', questionList);
      if (questionList) {
        status += 'QUESTION_LIST_FOUND ';
      } else {
        status += 'QUESTION_LIST_NOT_FOUND ';
      }
    } catch (err) {
      // console.log('=== Error retrieving findQuestionListByParams:', err);
      status += err.message;
      success = false;
    }
  }

  // Retrieve the questionnaires so we can organize the answers by questionnaire
  if (success && questionnaireIdList.length > 0) {
    // Get the list of questions so we know what the person is answering
    try {
      questionnaireList = await findQuestionnaireListByIdList(questionnaireIdList);
      success = true;
      // console.log('== AFTER findQuestionnaireListByIdList questionnaireList:', questionnaireList);
      if (questionnaireList) {
        status += 'QUESTIONNAIRE_LIST_FOUND ';
      } else {
        status += 'QUESTIONNAIRE_LIST_NOT_FOUND ';
      }
    } catch (err) {
      // console.log('=== Error retrieving findQuestionnaireListByIdList:', err);
      status += err.message;
      success = false;
    }
  }
  return {
    questionAnswerList,
    questionList,
    questionnaireList,
    success,
    status,
  };
};

exports.saveAnswerToMappedField = async (fieldMappingRule, answerValueTyped, personId) => {
  //
  const fieldOfInterest = fieldMappingRule.split('.')[1];
  const personChangeDict = {};
  let status = '';
  let success = true;
  let tableOfInterestFound = false;
  console.log('fieldMappingRule:', fieldMappingRule, ', answerValueTyped:', answerValueTyped, ', personId:', personId);
  // Find the table
  try {
    if (fieldMappingRule.includes('Person.')) {
      status += `TABLE_OF_INTEREST_INCLUDES_PERSON: ${fieldMappingRule} `;
      tableOfInterestFound = true;
    }
    if (!tableOfInterestFound) {
      status += `TABLE_OF_INTEREST_INCLUDES_NOT_FOUND: ${fieldMappingRule} `;
    }
  } catch (err) {
    status += `ERROR_WITH_TABLE: ${fieldOfInterest} `;
    status += err.message;
    success = false;
  }
  // Find the field
  if (success) {
    try {
      if (arrayContains(fieldOfInterest, PERSON_FIELDS_ACCEPTED)) {
        personChangeDict.id = personId;
        personChangeDict[fieldOfInterest] = answerValueTyped;
        console.log('Updating person:', personChangeDict);
        const person = await savePerson(personChangeDict);
        status += `PERSON_UPDATED FIELD: ${fieldOfInterest} VALUE: ${answerValueTyped} `;
      } else {
        status += `FIELD_NOT_ACCEPTED: ${fieldOfInterest} `;
      }
    } catch (err) {
      status += `ERROR_WITH_FIELD: ${fieldOfInterest} `;
      status += err.message;
      success = false;
    }
  }
  return {
    success,
    status,
  };
};
