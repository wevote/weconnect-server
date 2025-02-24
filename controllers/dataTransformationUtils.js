// weconnect-server/controllers/dataTransformationUtils.js
const { convertToInteger } = require('../utils/convertToInteger');

function extractSearchParamsFromIncomingParams (queryParams, fieldsAccepted = {}) {
  const updateDict = {};
  console.log('==== extractSearchParamsFromIncomingParams queryParams:', queryParams, ', fieldsAccepted:', fieldsAccepted);
  Array.from(queryParams.entries()).forEach(([key, value]) => {
    console.log('==== key:', key, ', value:', value);
    let thisFieldAccepted = false;
    try {
      if (fieldsAccepted && fieldsAccepted.includes(key)) {
        thisFieldAccepted = true;
      } else {
        console.log('==== fieldsAccepted.includes did not find key: ', key);
      }
    } catch (error) {
      // console.error('Error checking if field is accepted:', error);
      if (fieldsAccepted && key in fieldsAccepted) {
        // NEW WAY
        console.log('==== *** NEW WAY worked: ', key);
        thisFieldAccepted = true;
      } else {
        console.log('==== *** NEW WAY undefined: ', key);
      }
    }
    if (thisFieldAccepted) {
      updateDict[key] = value;
      console.log('==== *** field accepted: ', key);
    } else {
      console.log('==== *** field not accepted: ', key);
    }
  });
  console.log('==== extractSearchParamsFromIncomingParams updateDict:', updateDict);
  return updateDict;
}

function extractQuestionAnswersFromIncomingParams (queryParams) {
  const updateDict = {};
  let questionId = -1;
  const keys = Array.from(queryParams.keys());
  const values = Array.from(queryParams.values());
  for (let i = 0; i < keys.length; i++) {
    // console.log('==== extractQuestionAnswersFromIncomingParams key:', keys[i], ', value:', values[i]);
    if (keys[i].startsWith('questionAnswer-')) {
      questionId = keys[i].replace('questionAnswer-', '');
      updateDict[questionId] = values[i];
    }
  }
  return updateDict;
}

function extractVariablesToChangeFromIncomingParamsObject (queryParamsObj, fieldsAccepted = {}) {
  const updateDict = {};
  Object.keys(queryParamsObj).forEach((key) => {
    const cleanKey = key.replace('ToBeSaved', '');
    if (fieldsAccepted.indexOf(cleanKey) > -1) {
      updateDict[cleanKey] = queryParamsObj[key];
    }
  });
  return updateDict;
}

function extractVariablesToChangeFromIncomingParams (queryParams, fieldsAccepted = {}) {
  let keyWithoutToBeSaved = '';
  let thisFieldAccepted = false;
  const updateDict = {};
  // console.log('==== extractVariablesToChangeFromIncomingParams queryParams:', queryParams);
  // eslint-disable-next-line no-restricted-syntax
  for (const [key, value] of queryParams) {
    // console.log('==== key:', key, ', value:', value);
    keyWithoutToBeSaved = key.replace('ToBeSaved', '');
    thisFieldAccepted = false;
    try {
      if (fieldsAccepted && fieldsAccepted.includes(keyWithoutToBeSaved)) {
        // OLD WAY
        thisFieldAccepted = true;
      }
    } catch (error) {
      // console.error('Error checking if field is accepted:', error);
      if (fieldsAccepted && keyWithoutToBeSaved in fieldsAccepted) {
        // NEW WAY
        // console.log('==== *** NEW WAY worked: ', keyWithoutToBeSaved);
        thisFieldAccepted = true;
      } else {
        // console.log('==== *** NEW WAY undefined: ', keyWithoutToBeSaved);
      }
    }
    if (thisFieldAccepted) {
      if (queryParams && queryParams.get(`${keyWithoutToBeSaved}Changed`) === 'true') {
        // NEW WAY that uses dictionaries to map accepted fields to their expected types
        if (keyWithoutToBeSaved && keyWithoutToBeSaved in fieldsAccepted) {
          if (fieldsAccepted[keyWithoutToBeSaved] === 'BOOLEAN') {
            // console.log('==== *** BOOLEAN: ', value);
            if (value === 'true' || value === true) {
              updateDict[keyWithoutToBeSaved] = true;
            } else if (value === 'false' || value === false) {
              // console.log('==== *** boolean: ', false);
              updateDict[keyWithoutToBeSaved] = false;
            } else {
              console.log('==== *** expected boolean, but invalid value: ', value);
            }
          } else if (fieldsAccepted[keyWithoutToBeSaved] === 'INTEGER') {
            // console.log('==== *** INTEGER: ', value);
            updateDict[keyWithoutToBeSaved] = convertToInteger(value);
          } else {
            // console.log('==== *** undefined: ', value);
            try {
              updateDict[keyWithoutToBeSaved] = value.trim();
              // console.log('value.trim() successful value:', value);
            } catch (error) {
              // console.error('Error parsing value:', value, 'Error:', error);
              updateDict[keyWithoutToBeSaved] = value;
            }
          }
        } else {
          // OLD WAY that just lists the accepted fields in an array
          // console.log('==== *** OLD WAY: ', keyWithoutToBeSaved);
          // eslint-disable-next-line no-lonely-if
          if (value === 'true') {
            updateDict[keyWithoutToBeSaved] = true;
          } else if (value === 'false') {
            // console.log('==== *** boolean: ', false);
            updateDict[keyWithoutToBeSaved] = false;
          }  else {
            // console.log('==== *** string');
            try {
              updateDict[keyWithoutToBeSaved] = value.trim();
              // console.log('value.trim() successful value:', value);
            } catch (error) {
              // console.error('Error parsing value:', value, 'Error:', error);
              updateDict[keyWithoutToBeSaved] = value;
            }
          }
        }
      }
    } else {
      // console.log('==== *** field not accepted: ', keyWithoutToBeSaved);
    }
  }
  // console.log('==== extractVariablesToChangeFromIncomingParams updateDict:', updateDict);
  return updateDict;
}

module.exports = {
  extractSearchParamsFromIncomingParams,
  extractQuestionAnswersFromIncomingParams,
  extractVariablesToChangeFromIncomingParamsObject,
  extractVariablesToChangeFromIncomingParams,
}; // Export the functions
