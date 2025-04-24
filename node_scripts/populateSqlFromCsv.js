// Utility to populate the WeConnectDB from a spreadsheet that has been exported as csv
// Open a terminal window in ~/WebstormProjects/weconnect-server/node_scripts
// node populateSqlFromCsv.js WV-960.csv

// If you dropped and recreated the WeConnectDB before running this, start by resetting your password in the weconnect-client

// Note: Webstorm format JSON Command+Option+L

const csv = require('csv-parser');
const fs = require('fs');
const dotenv = require('dotenv');
const { findPersonListByParams, createPerson, savePerson } = require('../models/personModel');
const { updateOrCreateTeamMember, createTeam, findTeamByName } = require('../models/teamModel');

dotenv.config({ path: '../.env' });   // use the weconnect-server's .env file

/* eslint-disable no-await-in-loop */

const usaDateToIso = (dateString) => {
  if (!dateString || !dateString.includes('/')) {
    return undefined;
  }
  const [month, day, year] = dateString.split('/').map(Number);
  if (month === 0 || month === undefined || day === 0 || day === undefined || year === 0 || year === undefined) {
    return undefined;
  }
  const fullYear = year < 2000 ? 2000 + year : year; // Assuming the year is in the 21st century
  const date = new Date(fullYear, month - 1, day);
  return date.toISOString();
};

const createPersonUpdateDict = (row) => {
  const dict = {};
  let isFlaggedInCsvAsAuthoritative = true;
  let who = row.Who;
  try {
    // Name
    who = who.replace('\n', '');
    if (who.startsWith('*')) {
      isFlaggedInCsvAsAuthoritative = false;
      who = who.replace('* ', '');
    }
    const dashedParts = who.split(' - ');
    const leave = (dashedParts[1] && (dashedParts[1].toLowerCase().includes('break') || dashedParts[1].toLowerCase().includes('leave'))) || false;
    const resigned = (dashedParts[1] && dashedParts[1].toLowerCase().includes('resigned')) || false;
    dict.statusResigned = resigned;
    // Moved to an explicit row named "Active", instead of a calculated value
    // dict.statusActive = !leave && !resigned;
    dict.statusOnLeave = leave;
    let cleaned = dashedParts.length > 1 ? dashedParts[0] : who;
    const nickName = cleaned.match(/.*?\((.*?)\).*?/);
    if (nickName && nickName[1]) {
      dict.firstNamePreferred = nickName[1];
      cleaned = cleaned.replace(/\((.*?)\)\s/, '');
    }
    cleaned = cleaned.replace('**', '');
    const nameParts = cleaned.split(' ');
    dict.firstName = nameParts[0]?.trim();
    dict.lastName = nameParts[1] + (nameParts.length === 3 ? (` ${nameParts[2].trim()}`) : '');   // Jill Depti Bargam
    dict.importNote = dashedParts[1] || '';

    dict.statusEmailCreated = row['*We Vote Email Created\n(link)'].trim() === 'Done';
    dict.statusOfferApproved = row['Team meeting OR 2nd interview'].trim() === 'Done';
    dict.statusOfferDecisionNeeded = false; // We are setting this to false for all imported people
    dict.statusOfferLetterCreated = row['Create Offer Letter'].trim() === 'Done';
    dict.statusOfferLetterSigned = row['Offer Letter Status (before purple line)'].trim() === 'Signed';
    // dict.???  = row['Team On- boarding Status'].trim() === 'Complete';
    dict.jazzHrUrl = row['Jazz Link'];
    dict.location = row.Location;
    dict.stateCode = row.State;
    dict.jobTitle = row['*Title / Volunteering Love'];
    const secondary = row['2nd Email'].toLowerCase();    // 95% of the time this ends with @gmail.com or equiv. ==> emailPersonal
    const primary = row['Primary Email'].toLowerCase();  // 95% of the time this ends with @wevoteeducation.org or @wevote.us ==> emailOfficial
    if (primary.includes('wevoteeducation.org') || primary.includes('wevote.us')) {           // 95% of the time
      dict.emailOfficial = primary;
      dict.emailPersonal = secondary;
    } else if (!primary.includes('wevoteeducation.org') && !primary.includes('wevote.us')) {  // 5 % of the time
      dict.emailOfficial = secondary;
      dict.emailPersonal = primary;
    }
    if (dict.emailPersonal.length === 0) {
      dict.emailPersonal = dict.emailOfficial;
    }

    dict.dateStartDate = usaDateToIso(row['Start date']);
    dict.dateEndDate = usaDateToIso(row['Known End date']);
    dict.statusActive = row.Active === 1 || row.Active === '1'; // Making this an explicit column instead of calculated
    dict.statusAvailableForSpecialProjects = row['Available for Special Projects'] === 1 || row['Available for Special Projects'] === '1';
    dict.emailPersonalAlternate = row['Third email'];
    dict.birthdayMonthAndDay = row['Birthday Month / Day'];
    dict.linkedInUrl = row.LinkedIn;
    dict.hoursPerWeekEstimate = parseInt(row['Hours per week']);
    dict.hoursVolunteered = parseInt(row['Hours spent (Active)']);
    /* Ignored spreadsheety cells:
      "howLongAtOrg": "How long at We Vote?": "End Date in Past": "For Active Sum":
      These should not be persisted in SQL, they will be wrong the next day, and already we store the startDate

    Not in db
      "Attended Intro to We Vote":  "IDE installed? (DM)":  "Eng Pair Scheduled (DM)":
      "Team meeting OR 2nd interview": "Confirmation questions sent?": "Invite to Slack":
      "Answers received": "Email Credentials sent via Slack":
      "JazzHR New WeVote Email Message": "*Offer Letter Created":
      "Offer Letter Signed by Dale": "Offer Letter Signed by Volunteer": "Welcome to the team!":
      "Access to Google Drive": "Update status in JazzHR": "Slack Profile\nReminder":
      "Small Team Slack": "Large Team Slack": "Calendar Event (Sephra / Dale)":
      "Listserv (wevote email) (Meli)": "Signed PDF in folder? (Meli)": "We Vote email signature":
      "Public Intranet Edit Access": "Private Intranet Edit Access": "Add to Staff History":
      "Com- munica- tion\nPart 1": "Part 2":  "Part 3": "Part 4": "Part 5":
      "* Added to We Vote LinkedIn?": "Birthday fundraiser reminders (NA)": "JazzHR Getting Started w/ Community Outreach":
      "Community Outreach Google Drive": "Marketing Google Drive": "Design Google Drive":
      "Figma Read Only (Dale)": "Access to Canva (Sephra)": "Access to Hubspot":
      "JazzHR Getting Started with Product Design": "Figma\n(Dale)": "Access to Jira":
      "Pageflows": "Access to OpenReplay": "JazzHR Getting Started w/ Marketing": "Strategy Google Drive link":
      "Videos & Photos": "Mailchimp (news- letter team)": "Hootsuite Password Google Doc": "X.com":
      "TikTok Pass Google Doc": "Facebook/Insta": "BlueSky": "JazzHR Getting Started w/ Marketing Analytics":
      "Access to API Server (Optional)": "Google Analytics": "Google Tag Manager": "Google Ads (c3 &c4)":
      "Google Search Console": "New Relic": "JazzHR Getting Started w/ Engineering": "Github Team":
      "Access to Jira\n(link)": "JazzHR Getting Started w/ WebApp & WeVoteServer": "Engineering Google Drive (link)":
      "Access to API Server": "OpenReplay Invitation": "Browser Stack": "JazzHR Getting Started w/ Political Data":
      "Political Data Google Drive": "Data & Standards Google Drive": "JazzHR Getting Started w/ Talent Acquisition":
      "Access to JazzHR": "Volunteer Management Google Drive": "Jira Access (link)": "Access to VolunteerMatch":
      "Access to Idealist": "Access to Handshake": "JazzHR Getting Started w/ HR": "Volunteer Management Google Drive (link)":
      "Jira User Admin Access (link)": "WeVote API Server Voter Manager": "Admin.Google User/Groups Mgmnt":
      "JazzHR Getting Started w/ Donor Management": "JazzHR Getting Started w/ Writing & Training":
      "Writing & Training Google Drive (link)": "Volunteer Management Drive (link)":
      "Checking in: Still interested?": "Service Ending? email sent": "Service ended email":
      "Removed from Slack": "Removed from Slack teams (NA)": "Email account deleted? (SR)":
      "Removed from listservs (MM)": "Google drive access removed": "Access to collaboration tools (further left)":
      "Final JazzHR Status Updated":
      */
  } catch (e) {
    console.log('Exception in createPersonUpdateDict: ', e);
  }
  return { isFlaggedInCsvAsAuthoritative, dict, who };
};


const results = [];

const args = process.argv.slice(2);

const headerStr = 'Team,' +
  'Who,D1,D2,D3,D4,D5,Offer Letter Status (before purple line),Team On- boarding Status,Jazz Link,Location,State,*Title / Volunteering Love,c3/ c4,Primary Email,2nd Email,Start date,' +
  'Known End date,Active,Available for Special Projects,' +
  'Third email,Birthday Month / Day,LinkedIn,Hours per week,Hours spent (Active),How long at We Vote?,,End Date in Past,Is Active,For Active Sum,,Attended Intro to We Vote,IDE installed? (DM),Eng Pair Scheduled (DM),Team meeting OR 2nd interview,Confirmation questions sent?,Invite to Slack,Answers received,' +
  '"*We Vote Email Created\n(link)",' +
  'Email Credentials sent via Slack,"JazzHR ""New WeVote Email"" Message",*Offer Letter Created,' +
  'Create Offer Letter,Offer Letter Signed by Dale,Offer Letter Signed by Volunteer,"""Welcome to the team!""",Access to Google Drive,Update status in JazzHR,"Slack Profile\n' +
  'Reminder",,Small Team Slack,Large Team Slack,Calendar Event (Sephra / Dale),Listserv (wevote email) (Meli),,Signed PDF in folder? (Meli),We Vote email signature,Public Intranet Edit Access,Private Intranet Edit Access,Add to Staff History,"Com- munica- tion\n' +
  'Part 1",Part 2,Part 3,Part 4,Part 5,* Added to We Vote LinkedIn?,Birthday fundraiser reminders (NA),,"JazzHR ""Getting Started w/ Community Outreach""",Community Outreach Google Drive,Marketing Google Drive,Design Google Drive,Figma Read Only (Dale),Access to Canva (Sephra),Access to Hubspot,,"JazzHR ""Getting Started with Product Design""",Marketing Google Drive,Design Google Drive,"Figma\n' +
  '(Dale)",Access to Canva (Sephra),Access to Jira,Pageflows,Access to OpenReplay,,"JazzHR ""Getting Started w/ Marketing""",Marketing Google Drive,Strategy Google Drive link,Design Google Drive,Videos & Photos,Access to Jira,Access to Canva (Sephra),Mailchimp (news- letter team),,Hootsuite Password Google Doc,X.com,TikTok Pass Google Doc,Facebook/Insta,BlueSky,LinkedIn Access,,"JazzHR ""Getting Started w/ Marketing Analytics""",Marketing Google Drive,Access to Jira,,Access to API Server (Optional),Access to OpenReplay,Google Analytics,Google Tag Manager,Google Ads (c3 &c4),Google Search Console,New Relic,,"JazzHR ""Getting Started w/ Engineering""",Github Team,"Access to Jira\n' +
  '(link)","JazzHR ""Getting Started w/ WebApp & WeVoteServer""",Engineering Google Drive (link),Access to API Server,,OpenReplay Invitation,Browser Stack,,"JazzHR ""Getting Started w/ Political Data""",Access to API Server,Political Data Google Drive,Data & Standards Google Drive,,"JazzHR ""Getting Started w/ Talent Acquisition""",Access to JazzHR,Volunteer Management Google Drive,Jira Access (link),Access to VolunteerMatch,Access to Idealist,Access to Handshake,,"JazzHR ""Getting Started w/ HR",Access to JazzHR,Volunteer Management Google Drive (link),Jira User Admin Access (link),WeVote API Server Voter Manager,Admin.Google User/Groups Mgmnt,,"JazzHR ""Getting Started w/ Donor Management""",Access to Hubspot,,"JazzHR ""Getting Started w/ Writing & Training""",Jira User Admin Access (link),Writing & Training Google Drive (link),Volunteer Management Drive (link),,Checking in: Still interested?,Service Ending? email sent,Service ended email,Removed from Slack,Removed from Slack teams (NA),Email account deleted? (SR),Removed from listservs (MM),Google drive access removed,Access to collaboration tools (further left),Final JazzHR Status Updated';
const headerStrLessDoubleQuotes = headerStr.replaceAll('"', '');
const columnTitles = headerStrLessDoubleQuotes.split(',');

function isTeamATeamName (str) {
  if (str.length === 0) {
    return false; // Handle empty string case
  }
  const firstChar = str.charAt(0);
  return firstChar >= 'A' && firstChar <= 'Z';
}

const processCsv = async (file) => {
  let teamFromSql;
  let teamsAdded = 0;
  let peopleAdded = 0;
  fs.createReadStream(file)
    .pipe(csv({
      headers: columnTitles,
      // eslint-disable-next-line no-unused-vars
      mapValues: ({ header, index, value }) => value.replaceAll('"', '').replaceAll('/n', ''),
    }))
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      for (let i = 0; i < results.length; i++) {
        const row = results[i];
        const isTeamNameRow  = isTeamATeamName(row.Team);
        if (i === 0) {
          /* empty */
        } else if (i === 1) {
          // console.log(row);
        } else if (isTeamNameRow) {
          const teamDict = {
            teamName: row.Team,
            statusActive: true,
          };
          teamFromSql = await findTeamByName(row.Team);
          if (!teamFromSql) {
            teamFromSql = await createTeam(teamDict);
            teamsAdded += 1;
            console.log('------------------- Team Created ---------------------', row.Team);
          }
        } else {
          // Person save or update (or don't save person if person exists and this row is non-authoritative)
          const { isFlaggedInCsvAsAuthoritative, dict: personUpdateDict, who } = createPersonUpdateDict(row);
          let person = await findPersonListByParams({ emailPersonal: personUpdateDict.emailPersonal }, true);
          person = (person.length > 0) ? person[0] : undefined;
          const isNonAuthoritativeInSQL = person?.nonAuthoritativeImport || false;

          console.log(`ROW ${personUpdateDict.lastName} ${personUpdateDict.emailPersonal} ${personUpdateDict.emailOfficial}`);
          if (personUpdateDict.emailPersonal.length === 0 && personUpdateDict.emailOfficial.length === 0) {
            console.log(`ROW SKIPPED: No valid personal or official ('2nd Email' or 'Primary Email') in row #${i}: ${who}`);
          }
          if (isFlaggedInCsvAsAuthoritative && !person) {
            // First instance of a person in the sheet, is authoritative, and does not exist in SQL
            console.log(`Authoritative Person creates new person: '${who}'  '${personUpdateDict.firstName}'  '${personUpdateDict.lastName}'  '${personUpdateDict.emailPersonal}'`);
            personUpdateDict.nonAuthoritativeImport = false;   // nonAuthoritativeImport Already defaults as false, but here for self-documentation
            person = await createPerson(personUpdateDict);
            // authoritativePersons.push(person.emailPersonal);
            peopleAdded += 1;
          }  else if (isFlaggedInCsvAsAuthoritative && person && isNonAuthoritativeInSQL) {
            // If the first instance of a person in the sheet was non-authoritative (starts with a  '*'), we saved them so that
            // we could add them to a team.  This instance is authoritative, so overwrite the non-authoritative person with this authoritative row
            console.log(`Authoritative Person overwrites non-authoritative: '${who}'  '${personUpdateDict.firstName}'  '${personUpdateDict.lastName}'  '${personUpdateDict.emailPersonal}'`);
            personUpdateDict.id = person.id;
            personUpdateDict.nonAuthoritativeImport = false;
            person = await savePerson(personUpdateDict);
            peopleAdded += 1;
          } else if (!isFlaggedInCsvAsAuthoritative && !person) {
            // Save a non-authoritative person, since that person does not exist in SQL, and we need to add them to a team
            console.log(`Non-authoritative Person created: '${who}'  '${personUpdateDict.firstName}'  '${personUpdateDict.lastName}'  '${personUpdateDict.emailPersonal}'`);
            personUpdateDict.nonAuthoritativeImport = true;   // This case is the reason we need this field
            person = await createPerson(personUpdateDict);
          } else {
            console.log(`Non-authoritative Person NOT saved: '${who}'  '${personUpdateDict.firstName}'  '${personUpdateDict.lastName}'  '${personUpdateDict.emailPersonal}'`);
          }
          if (person && teamFromSql) {
            // Add the person to the team
            const teamUpdateDict = {
              teamMemberFirstName: person.firstName,
              teamMemberLastName: person.lastName,
              teamName: teamFromSql.teamName,
              statusIsActiveInTeam: true,
            };
            console.log(`updateOrCreateTeamMember: '${who}'  '${person.id}' '${teamFromSql.id}'  '${teamUpdateDict}'`);
            // const teamMember =
            await updateOrCreateTeamMember(person.id, teamFromSql.id, teamUpdateDict);
            // console.log(teamMember);
          } else {
            console.log(`\n\nERROR: Team or Person not found, person: ${person}, team: ${teamFromSql}\n\n`);
          }
        }
      }
      console.log(`\n\nDONE ---------------- teams added: ${teamsAdded} ---- people added: ${peopleAdded}`);
    });
};

// Inline startup code
const file = args[0];
processCsv(file).then();
