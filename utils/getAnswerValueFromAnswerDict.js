function getAnswerValueFromAnswerDict (answerDict) {
  // console.log('getAnswerValueFromAnswerDict answerDict: ', answerDict);
  if (answerDict.answerType === 'BOOLEAN') {
    return answerDict.answerBoolean;
  } else if (answerDict.answerType === 'INTEGER') {
    return answerDict.answerInteger || 0;
  } else if (answerDict.answerType === 'STRING') {
    return answerDict.answerString || '';
  }
  return '';
}

module.exports = {
  getAnswerValueFromAnswerDict,
};