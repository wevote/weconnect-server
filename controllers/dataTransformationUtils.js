// weconnect-server/controllers/dataTransformationUtils.js

function extractQuestionAnswersFromIncomingParams (queryParams) {
  const updateDict = {};
  let questionId = -1;
  const keys = Array.from(queryParams.keys());
  const values = Array.from(queryParams.values());
  for (let i = 0; i < keys.length; i++) {
    console.log('==== key:', keys[i], ', value:', values[i]);
    if (keys[i].startsWith('questionAnswer-')) {
      questionId = keys[i].replace('questionAnswer-', '');
      updateDict[questionId] = values[i];
    }
  }
  return updateDict;
}

function extractVariablesToChangeFromIncomingParams (queryParams, fieldsAccepted = {}) {
  let keyWithoutToBeSaved = '';
  const updateDict = {};
  // console.log('==== extractVariablesToChangeFromIncomingParams queryParams:', queryParams);
  // eslint-disable-next-line no-restricted-syntax
  for (const [key, value] of queryParams) {
    // console.log('==== key:', key, ', value:', value);
    keyWithoutToBeSaved = key.replace('ToBeSaved', '');
    if (fieldsAccepted.includes(keyWithoutToBeSaved)) {
      if (queryParams && queryParams.get(`${keyWithoutToBeSaved}Changed`) === 'true') {
        if (value === 'true') {
          // console.log('==== *** boolean: ', true);
          updateDict[keyWithoutToBeSaved] = true;
        } else if (value === 'false') {
          // console.log('==== *** boolean: ', false);
          updateDict[keyWithoutToBeSaved] = false;
        } else {
          // console.log('==== *** string');
          updateDict[keyWithoutToBeSaved] = value.trim();
        }
      }
    }
  }
  return updateDict;
}

module.exports = {
  extractQuestionAnswersFromIncomingParams,
  extractVariablesToChangeFromIncomingParams,
}; // Export the functions
