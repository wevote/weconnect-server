function getAnswerValueFromAnswerDict (answerDict) {
  // console.log('getAnswerValueFromAnswerDict answerDict: ', answerDict);
  if (answerDict.answerType === 'BOOLEAN') {
    return answerDict.answerBoolean;
  } else if (answerDict.answerType === 'DATE') {
    console.log('answerDict for DATE:', answerDict);
    if (answerDict.answerDateTime) {
      const dateTime = new Date(answerDict.answerDateTime);
      const dateTimeString = dateTime.toISOString();
      console.log('dateTimeString:', dateTimeString);
      return dateTimeString;
    }
    return null;
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
