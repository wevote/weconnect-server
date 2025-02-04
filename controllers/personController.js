// weconnect-server/controllers/personController.js

const displayFullNamePreferred = (person) => {
  let fullName = '';
  if (person.firstNamePreferred) {
    fullName += person.firstNamePreferred;
  } else if (person.firstName) {
    fullName += person.firstName;
  }
  if (fullName.length > 0 && person.lastName) {
    fullName += ' ';
  }
  if (person.lastName) {
    fullName += person.lastName;
  }
  return fullName;
};

module.exports = { displayFullNamePreferred };
