// weconnect-server/controllers/dataTransformationUtils.js
const { convertToInteger } = require('../utils/convertToInteger');

function extractQuestionAnswersFromIncomingParams (queryParams) {
  const updateDict = {};
  let questionId = -1;
  const keys = Array.from(queryParams.keys());
  const values = Array.from(queryParams.values());
  for (let i = 0; i < keys.length; i++) {
    // console.log('==== key:', keys[i], ', value:', values[i]);
    if (keys[i].startsWith('questionAnswer-')) {
      questionId = keys[i].replace('questionAnswer-', '');
      updateDict[questionId] = values[i];
    }
  }
  return updateDict;
}

/* this could just be ...
  const queryParams = {};
  const searchParams = new URLSearchParams(new URL(url).search);
  for (const [key, value] of searchParams.entries()) {
    queryParams[key] = value;
  }
 */

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
  extractQuestionAnswersFromIncomingParams,
  extractVariablesToChangeFromIncomingParams,
}; // Export the functions
