const { PrismaClient } = require('@prisma/client');
const { isoFutureDateDays } = require('./personModel');


const prisma = new PrismaClient();

async function deleteOneSessionRecord (sessionID) {
  console.log('deleting session: ', sessionID);
  const sess = sessionID;
  try {
    await prisma.clientSession.delete({
      where: {
        sessionID: sess,
      },
    });
  } catch (e) {
    console.log('deleting session FAILED: Record to delete does not exist.');
  }
}

async function getPersonIdBySessionId (sessionID) {
  const session = await prisma.clientSession.findUnique({
    where: {
      sessionID,
    },
  });

  if (!session) {
    return 0;
  }

  const now = new Date();
  if (session.dateExpires < now) {
    console.log('deleting expired session #', session.id, ', with expiration date: ', session.dateExpires);
    deleteOneSessionRecord(session.sessionID);
    return 0;
  }

  return session.personId;
}

async function createSessionRecord (personId, sessionID, userAgent) {
  try {
    const dateExpires = isoFutureDateDays(14);
    const session = await prisma.clientSession.upsert({
      where: {
        personId,
        sessionID,
      },
      update: {
        dateExpires,
      },
      create: {
        personId,
        sessionID,
        userAgent,
        dateExpires,
      },
    });
    console.log('session added or updated: ', session.id, session.sessionID);
  } catch (e) {
    console.log('session NOT added: ', e);
  }
}

async function updateExpiration (connectSessionValue, dateExpiration) {
  const upResult =  prisma.clientSession.update({
    where: {
      connectSessionValue,
    },
    data: {
      dateExpiration,
    },
  });
  return upResult;
}


module.exports = {
  deleteOneSessionRecord,
  getPersonIdBySessionId,
  createSessionRecord,
  updateExpiration,
};
