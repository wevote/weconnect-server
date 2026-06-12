Start with a "Plain" database backup from the master server, if you don't have access to the Production pgAdmin 4 instance ask Steve or Dale to get you the file.
In this example the file is named ....  `backupJune10-1048pmPlain`

If the backup file does not match the latest schema, you will have problems, so get an uptodate backup file.

Use the pgAdmin4, **Tools | Storage Manager** to download the file to your Mac.

You want to get the file in to the weconnect-db, so copy the file to `/tmp/docker` on your local, and it will be accessible at `/tmp` in a weconnect-db shell.


1) In a terminal, open a shell in the db container: `docker compose exec weconnect-db sh`
2) Drop the existing database:
    `DROP DATABASE wevoteserverdb WITH (FORCE);`
3) Recreate the database:
    `CREATE DATABASE wevoteserverdb;`
4) Populate the database from the database backup file:
    `psql -X -f /tmp/backupJune10-1048pmPlain  "wevoteserverdb"`

```
stevepodell@Steves-MBP-M1-Dec2021 weconnect-server % docker compose exec weconnect-db sh
/ $ bash
c128feb3ec2f:/$ psql
psql (16.14)
Type "help" for help.

postgres=# \l
                                                         List of databases
      Name      |  Owner   | Encoding | Locale Provider |  Collate   |   Ctype    | ICU Locale | ICU Rules |   Access privileges
----------------+----------+----------+-----------------+------------+------------+------------+-----------+-----------------------
 postgres       | postgres | UTF8     | libc            | en_US.utf8 | en_US.utf8 |            |           |
 template0      | postgres | UTF8     | libc            | en_US.utf8 | en_US.utf8 |            |           | =c/postgres          +
                |          |          |                 |            |            |            |           | postgres=CTc/postgres
 template1      | postgres | UTF8     | libc            | en_US.utf8 | en_US.utf8 |            |           | =c/postgres          +
                |          |          |                 |            |            |            |           | postgres=CTc/postgres
 wevoteserverdb | postgres | UTF8     | libc            | en_US.utf8 | en_US.utf8 |            |           |
(4 rows)

postgres=# DROP DATABASE wevoteserverdb WITH (FORCE);
DROP DATABASE
postgres=#
postgres=# CREATE DATABASE wevoteserverdb;
CREATE DATABASE
postgres=#
postgres=# CREATE ROLE rdsadmin WITH SUPERUSER LOGIN PASSWORD 'admin';
ERROR:  role "rdsadmin" already exists
postgres=# CREATE ROLE dbadmin WITH SUPERUSER LOGIN PASSWORD 'admin';
ERROR:  role "dbadmin" already exists
postgres=#
postgres=# \q
c128feb3ec2f:/$ psql -X -f /tmp/backupJune10-1048pmPlain  "wevoteserverdb"
```
Those "CREATE ROLE" lines are only necessary if you have wiped the db with `docker compose down -v`, so otherwise you can
skip them, or ignore the errors.

Then in the weconnect-client, in FastLoad.js in the function doFastLoad() **TEMPORARILY** change forceMaster to false
```
    /* HACK, DO NOT CHECKIN */ const forceMaster = false;  // Must be true, when checking in this file!  Override webAppConfig.STAFF_API_SERVER_API_ROOT_URL, since in this case we ALWAYS want to hit the master server
```
and in PostgresRowCounts.jsx do the same in function PostgresRowCounts()
```
    /* HACK, DO NOT CHECKIN */      const forceMaster = false;
```

**Be sure to undo these hacks before checkin in your code or FastLoad will not work for other developers.**

Every time you want to re-run fastload with a fresh database, you will need to repeat these steps.

Recreate the DevUser after every database drop/create
```
stevepodell@Steves-MBP-M1-Dec2021 weconnect-server % docker compose exec weconnect-api sh
# node ./node_scripts/createDevUser Samuel Adams samuel@adams.com ale
person created id # 676
# 
```


