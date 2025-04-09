/**
 * GET /
 * Home page.
 */
const  path    = require('path');
// Pug code ... broken as of 3/14/25
// exports.index = (req, res) => {
//   res.render('home', {
//     title: 'Home',
//   });
// };
exports.index = (req, res) => {
  res.sendFile(path.join(`${__dirname}/../misc/html/index.html`));
};
