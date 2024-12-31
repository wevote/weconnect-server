// weconnect-server/models/questionnaireModel.js, parallel to /prisma/schema/questionnaire.prisma

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const QUESTIONNAIRE_FIELDS_ACCEPTED = [
  'questionnaireInstructions',
  'questionnaireName',
  'questionnaireTitle',
];

const QUESTION_FIELDS_ACCEPTED = [
  'answerType',
  'fieldMappingRule',
  'questionInstructions',
  'questionOrder',
  'questionText',
  'requireAnswer',
  'statusActive',
];

function removeProtectedFieldsFromQuestion (question) {
  const modifiedQuestion = { ...question };
  return modifiedQuestion;
}

function removeProtectedFieldsFromQuestionAnswer (questionAnswer) {
  const modifiedQuestion = { ...questionAnswer };
  return modifiedQuestion;
}

function removeProtectedFieldsFromQuestionnaire (questionnaire) {
  const modifiedQuestionnaire = { ...questionnaire };
  return modifiedQuestionnaire;
}

async function findQuestionnaireById (id, includeAllData = false) {
  const questionnaire = await prisma.questionnaire.findUnique({
    where: {
      id,
    },
  });
  let modifiedQuestionnaire = {};
  if (includeAllData) {
    modifiedQuestionnaire = questionnaire;
  } else {
    modifiedQuestionnaire = removeProtectedFieldsFromQuestionnaire(questionnaire);
  }
  modifiedQuestionnaire.questionnaireId = questionnaire.id;
  return modifiedQuestionnaire;
}

function extractQuestionnaireVariablesToChange (queryParams) {
  let keyWithoutToBeSaved = '';
  const updateDict = {};
  Object.entries(queryParams).forEach(([key, value]) => {
    // console.log('==== key:', key, ', value:', value);
    keyWithoutToBeSaved = key.replace('ToBeSaved', '');
    if (QUESTIONNAIRE_FIELDS_ACCEPTED.includes(keyWithoutToBeSaved) && value) {
      if (queryParams && queryParams[`${keyWithoutToBeSaved}Changed`] === 'true') {
        updateDict[keyWithoutToBeSaved] = value;
      }
    }
  });
  return updateDict;
}

async function findQuestionAnswerListByParams (params = {}, includeAllData = false) {
  const questionAnswerList = await prisma.questionAnswer.findMany({
    where: params,
  });
  // console.log('findQuestionAnswerListByParams questionAnswerList:', questionAnswerList);
  let modifiedQuestionAnswer = {};
  const modifiedQuestionAnswerList = [];
  if (includeAllData) {
    questionAnswerList.forEach((questionAnswer) => {
      modifiedQuestionAnswer = { ...questionAnswer };
      // modifiedQuestionAnswer.questionAnswerId = questionAnswer.id;
      modifiedQuestionAnswerList.push(modifiedQuestionAnswer);
    });
  } else {
    questionAnswerList.forEach((questionAnswer) => {
      modifiedQuestionAnswer = removeProtectedFieldsFromQuestionAnswer(questionAnswer);
      // modifiedQuestionAnswer.questionAnswerId = questionAnswer.id;
      modifiedQuestionAnswerList.push(modifiedQuestionAnswer);
    });
  }
  return modifiedQuestionAnswerList;
}

async function findQuestionListByIdList (idList, includeAllData = false) {
  const questionList = await prisma.questionnaireQuestion.findMany({
    where: {
      id: { in: idList },
    },
  });
  // console.log('findQuestionListByIdList questionList:', questionList);
  let modifiedQuestion = {};
  const modifiedQuestionList = [];
  if (includeAllData) {
    questionList.forEach((question) => {
      modifiedQuestion = { ...question };
      modifiedQuestion.questionId = question.id;
      modifiedQuestionList.push(modifiedQuestion);
    });
  } else {
    questionList.forEach((question) => {
      modifiedQuestion = removeProtectedFieldsFromQuestion(question);
      modifiedQuestion.questionId = question.id;
      modifiedQuestionList.push(modifiedQuestion);
    });
  }
  // console.log('findQuestionListByIdList modifiedQuestionList:', modifiedQuestionList);
  return modifiedQuestionList;
}

async function findQuestionListByParams (params = {}) {
  const questionList = await prisma.questionnaireQuestion.findMany({
    where: params,
  });
  let modifiedQuestion = {};
  const modifiedQuestionList = [];
  questionList.forEach((question) => {
    modifiedQuestion = { ...question };
    modifiedQuestion.questionId = question.id;
    modifiedQuestionList.push(modifiedQuestion);
  });
  return modifiedQuestionList;
}

async function findQuestionnaireListByIdList (idList, includeAllData = false) {
  const questionnaireList = await prisma.questionnaire.findMany({
    where: {
      id: { in: idList },
    },
  });
  // console.log('findQuestionnaireListByIdList questionnaireList:', questionnaireList);
  let modifiedQuestionnaire = {};
  const modifiedQuestionnaireList = [];
  if (includeAllData) {
    questionnaireList.forEach((questionnaire) => {
      modifiedQuestionnaire = { ...questionnaire };
      modifiedQuestionnaire.questionnaireId = questionnaire.id;
      modifiedQuestionnaireList.push(modifiedQuestionnaire);
    });
  } else {
    questionnaireList.forEach((questionnaire) => {
      modifiedQuestionnaire = removeProtectedFieldsFromQuestionnaire(questionnaire);
      modifiedQuestionnaire.questionnaireId = questionnaire.id;
      modifiedQuestionnaireList.push(modifiedQuestionnaire);
    });
  }
  // console.log('findQuestionnaireListByIdList modifiedQuestionnaireList:', modifiedQuestionnaireList);
  return modifiedQuestionnaireList;
}

async function findQuestionnaireListByParams (params = {}, includeAllData = false) {
  const questionnaireList = await prisma.questionnaire.findMany({
    where: params,
  });
  let modifiedQuestionnaire = {};
  const modifiedQuestionnaireList = [];
  if (includeAllData) {
    questionnaireList.forEach((questionnaire) => {
      modifiedQuestionnaire = { ...questionnaire };
      modifiedQuestionnaire.questionnaireId = questionnaire.id;
      modifiedQuestionnaireList.push(modifiedQuestionnaire);
    });
  } else {
    questionnaireList.forEach((questionnaire) => {
      modifiedQuestionnaire = removeProtectedFieldsFromQuestionnaire(questionnaire);
      modifiedQuestionnaire.questionnaireId = questionnaire.id;
      modifiedQuestionnaireList.push(modifiedQuestionnaire);
    });
  }
  return modifiedQuestionnaireList;
}

async function findOneQuestionnaire (params, includeAllData = false) {   // Find one with array
  const questionnaire = await prisma.questionnaire.findUnique({
    where: params,
  });
  let modifiedQuestionnaire = {};
  if (includeAllData) {
    modifiedQuestionnaire = questionnaire;
  } else {
    modifiedQuestionnaire = removeProtectedFieldsFromQuestionnaire(questionnaire);
  }
  modifiedQuestionnaire.questionnaireId = questionnaire.id;
  return modifiedQuestionnaire;
}

async function deleteOne (id) {
  await prisma.questionnaire.delete({
    where: {
      id,
    },
  });
}

async function saveQuestion (question) {
  // console.log('saveQuestion question:', question);
  const updateQuestion = await prisma.questionnaireQuestion.update({
    where: {
      id: question.id,
    },
    data: question,
  });
  // console.log(updateQuestion);
  return updateQuestion;
}

async function saveQuestionnaire (questionnaire) {
  // console.log('saveQuestionnaire questionnaire:', questionnaire);
  const updateQuestionnaire = await prisma.questionnaire.update({
    where: {
      id: questionnaire.id,
    },
    data: questionnaire,
  });
  // console.log(updateQuestionnaire);
  return updateQuestionnaire;
}

async function createQuestion (updateDict) {
  const question = await prisma.questionnaireQuestion.create({ data: updateDict });
  return question;
}

async function createQuestionnaire (updateDict) {
  // eslint-disable-next-line prefer-object-spread
  const questionnaire = await prisma.questionnaire.create({ data: updateDict });
  return questionnaire;
}

function updateOrCreateQuestionAnswer (personId, questionId, questionnaireId, updateDict) {
  // eslint-disable-next-line prefer-object-spread
  const createDict = Object.assign({}, { personId, questionId, questionnaireId }, updateDict);
  try {
    const upResult =  prisma.questionAnswer.upsert({
      where: {
        questionIdPersonId: {
          questionId,
          personId,
        },
      },
      update: { ...updateDict },
      create: { ...createDict },
    });
    return upResult;
  } catch (err) {
    console.log('updateOrCreateTeamMember: ERROR ', err);
    return null;
  }
}

module.exports = {
  createQuestion,
  createQuestionnaire,
  deleteOne,
  extractQuestionnaireVariablesToChange,
  findQuestionAnswerListByParams,
  findQuestionListByIdList,
  findQuestionListByParams,
  findQuestionnaireById,
  findQuestionnaireListByIdList,
  findQuestionnaireListByParams,
  findOneQuestionnaire,
  QUESTION_FIELDS_ACCEPTED,
  QUESTIONNAIRE_FIELDS_ACCEPTED,
  removeProtectedFieldsFromQuestion,
  removeProtectedFieldsFromQuestionnaire,
  saveQuestion,
  saveQuestionnaire,
  updateOrCreateQuestionAnswer,
}; // Export the functions
