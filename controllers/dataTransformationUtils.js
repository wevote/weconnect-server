// weconnect-server/controllers/dataTransformationUtils.js

function extractVariablesToChangeFromIncomingParams (queryParams, fieldsAccepted = {}) {
  let keyWithoutToBeSaved = '';
  const updateDict = {};
  for (const [key, value] of queryParams) {
    // console.log('==== key:', key, ', value:', value);
    keyWithoutToBeSaved = key.replace('ToBeSaved', '');
    if (fieldsAccepted.includes(keyWithoutToBeSaved) && value) {
      if (queryParams && queryParams.get(`${keyWithoutToBeSaved}Changed`) === 'true') {
        updateDict[keyWithoutToBeSaved] = value.trim();
      }
    }
  }
  return updateDict;
}

module.exports = {
  extractVariablesToChangeFromIncomingParams,
}; // Export the functions
