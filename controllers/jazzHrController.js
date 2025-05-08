const axios = require('axios');
// https://app.jazz.co/app/settings/integrations
// https://www.resumatorapi.com/v1/#!/applicants/applicants_get

exports.jazzGetUsers = async (request, response) => {
  const { name, email } = request.body;
  // https://api.resumatorapi.com/v1/users/name/Podell?apikey=EY0R...
  // https://api.resumatorapi.com/v1/users/email/Podell?apikey=EY0R...
  // https://api.resumatorapi.com/v1/users/name/Podell/email/Podell?apikey=EY0R..

  let url = 'https://api.resumatorapi.com/v1/users/';
  if (name && name.length > 0) {
    url += `name/${encodeURIComponent(name)}/`;
  }
  if (email && email.length > 0) {
    url += `email/${encodeURIComponent(email)}/`;
  }
  url = url.slice(0, -1);
  url += `?apikey=${process.env.JAZZ_HR_API_KEY}`;

  let resp;
  try {
    resp = await axios.get(url);
  } catch (error) {
    resp = error;
    console.log(error);
  }
  console.log(resp);
  response.json({
    status: resp.status,
    statusText: resp.statusText,
    success: resp.statusText === 'OK',
    data: resp.data,
  });
};

exports.jazzGetApplicants = async (request, response) => {
  // https://api.resumatorapi.com/v1/applicants/from_apply_date/02%2F02%2F2025?apikey=EY0R...

  let url = 'https://api.resumatorapi.com/v1/applicants/';

  const entries = Object.entries(request.body);
  entries.forEach(([key, value]) => {
    if (value.length > 0) {
      url += `${key}/${encodeURIComponent(value)}/`;
    }
  });
  url = url.slice(0, -1);
  url += `?apikey=${process.env.JAZZ_HR_API_KEY}`;

  let resp;
  try {
    resp = await axios.get(url);
  } catch (error) {
    resp = error;
    console.log(error);
  }
  console.log(resp);
  response.json({
    status: resp.status,
    statusText: resp.statusText,
    success: resp.statusText === 'OK',
    data: resp.data,
  });
};
