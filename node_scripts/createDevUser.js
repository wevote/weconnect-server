const bcrypt = require('@node-rs/bcrypt');
const dotenv = require('dotenv');
const { createPerson } = require('../models/personModel');
const { getMaxId } = require('../controllers/FastLoad/retrieveTables');

dotenv.config({ path: '../.env' });   // use the weconnect-server's .env file
const args = process.argv.slice(2);


// python manage.py create_dev_user Samuel Adams samuel@adams.com ale
// node createDevUser Samuel Adams samuel@adams.com ale
// node ./node_scripts/createDevUser Samuel Adams samuel@adams.com ale
// node --inspect-brk ./node_scripts/createDevUser Samuel Adams samuel@adams.com ale
// eslint-disable-next-line no-shadow
const createDevUser = async (args) => {
  const [firstName, lastName, email, password] = args;

  try {
    const encryptedPwd = await bcrypt.hash(password, 10);
    const maxId = await getMaxId('Person');
    const id = parseInt(maxId, 10) + 1;
    const person = await createPerson({
      id,
      firstName,
      lastName,
      location: 'Oakland, CA',
      emailPersonal: email,
      emailOfficial: email,
      password: encryptedPwd,
      isAdmin: true,
      emailVerified: true,
      emailOfficialVerified: true,
      emailVerificationToken: '111111',
      statusActive: true,
    });
    console.log('person created id #', person.id);
  } catch (error) {
    if (error.code === 'P2002') {
      console.log(error.message);
      console.log('person creation error: The person already exists (unique email required)');
    } else {
      console.log('person creation error', error);
    }
  }
};


// Inline startup code
createDevUser(args).then();
