// utils/convertToInteger.js

function convertToInteger (incomingNumber) {
  return parseInt(incomingNumber, 10) || 0;
}

module.exports = {
  convertToInteger,
};
