November 22, 2024 (Notes, do not re-run these on your Mac)
npm install prisma --save-dev
npx prisma init
Used pgAdmin4 to create the WeConnectDB database on the existing server
npx prisma db push                      # creates the User table in postgres
npx prisma migrate dev --name init      # created migration files on the postgres server... ????, removed the table
npx prisma db push                      # Recreated the User table in postgres
npm install
node app.js                           # run it

    stevepodell@Steves-MBP-M1-Dec2021 weconnect-server % node index.js                
    []
    stevepodell@Steves-MBP-M1-Dec2021 weconnect-server % 

When you change the schema run:
prisma generate




