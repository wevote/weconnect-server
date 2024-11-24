const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.create({
      data: {
        name: 'Alice',
        gender: 'female',
        location: 'San Francisco',
        email: 'alice@prisma.io',
        website: 'https://alice.prisma.io',
        picture: '',
        password: '',
        passwordResetToken: '',
        passwordResetExpires: '2034-11-22T18:00:00.000Z',
        emailVerificationToken: '',
        emailVerified: false,

        snapchat: '',
        facebook: '',
        twitter: '',
        google: '',
        github: '',
        linkedin: '',
        steam: '',
        twitch: '',
        quickbooks: '',
        tokens: {},
      },
    });
    console.log(user);
  } catch (e) {
    console.log('User already has been created');
    console.log(e);
  }

  console.log('----------');

  const allUsers = await prisma.user.findMany();
  console.log(allUsers);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
