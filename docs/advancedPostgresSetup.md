## Diagnosing Postgres Install Issues
In the universe of developers who are starting up with WeVote, postgres has been installed on their machines in many ways.
The best way for a Mac is with Homebrew, since it takes care of many setup, run, and uninstall issues.
If you are having trouble, and Posygress was not installed with Homebrew, we recommend completely uninstalling postgres and starting over with Homebrew.

### Is postgres installed
Determine whether postgres installed by running `which postgres` in the terminal
<br><img src="docs/images/WhichPostgres.png" alt="Alt Text" width="600" >
This shows that postgres has been installed by homebrew, if no path to postgres is displayed, then postgres has not been previously installed

### Is postgres running
If postgres is installed, determine if it is already running with the macOS (Linux) command 'pgrep -l postgres'

```
stevepodell@Steves-MBP-M1-Dec2021 weconnect-server % pgrep -l postgres
2472 postgres
2474 postgres
...
43971 postgres
43972 postgres
43973 postgres
43974 postgres
43977 postgres
stevepodell@Steves-MBP-M1-Dec2021 weconnect-server % 
```

If you see a number of different macOS processes running, that means that postgres is running. 

### Running pgsql

```
stevepodell@Steves-MBP-M1-Dec2021 weconnect-server % psql
psql: error: connection to server on socket "/tmp/.s.PGSQL.5432" failed: FATAL:  database "stevepodell" does not exist
stevepodell@Steves-MBP-M1-Dec2021 weconnect-server % psql -h localhost
psql: error: connection to server at "localhost" (::1), port 5432 failed: could not initiate GSSAPI security context:  The operation or option is not available: Credential for asked mech-type mech not found in the credential handle
connection to server at "localhost" (::1), port 5432 failed: FATAL:  database "stevepodell" does not exist
stevepodell@Steves-MBP-M1-Dec2021 weconnect-server % psql -d template1
psql (14.14 (Homebrew))
Type "help" for help.

template1=# \list
                                    List of databases
      Name      |    Owner    | Encoding | Collate | Ctype |      Access privileges      
----------------+-------------+----------+---------+-------+-----------------------------
 WeConnectDB    | stevepodell | UTF8     | C       | C     | 
 WeVoteServerDB | stevepodell | UTF8     | C       | C     | 
 postgres       | stevepodell | UTF8     | C       | C     | 
 template0      | stevepodell | UTF8     | C       | C     | =c/stevepodell             +
                |             |          |         |       | stevepodell=CTc/stevepodell
 template1      | stevepodell | UTF8     | C       | C     | =c/stevepodell             +
                |             |          |         |       | stevepodell=CTc/stevepodell
(5 rows)

template1=# \q
```

### Find the path to the database files
```
psql (17.0, server 14.15 (Homebrew))
Type "help" for help.

WeConnectDB=# SHOW DATA_DIRECTORY;
data_directory
------------------------------
/usr/local/var/postgresql@14
(1 row)

WeConnectDB=# 
```

### Stopping the database, uninstalling postgres, and removing the database files
This is very rarely needed, but some configurations are so messed up that this becomes necessary.

1) Stop the postgres daemon `pg_ctl stop -D /usr/local/var/postgresql@14`
2) Cd to the postgres executable and file directory `cd /usr/local/var/postgresql@14`
3) Delete all the executables and the database files.  Make sure you are in the postgresql@14 directory, this is a very
powerful and potentially damaging command.  Remove all the files in this directory and all the files in subdirectory  
`rm -rf $(brew --prefix)/var/postgresql@14`

Postgres is gone.

```
stevepodell@Steves-MacBook-Air weconnect-client % pg_ctl stop -D /usr/local/var/postgresql@14
waiting for server to shut down.... done
server stopped
stevepodell@Steves-MacBook-Air weconnect-client %    


stevepodell@Steves-MacBook-Air weconnect-client % cd /usr/local/var/postgresql@14
stevepodell@Steves-MacBook-Air postgresql@14 % ls
PG_VERSION              pg_dynshmem             pg_multixact            pg_snapshots            pg_tblspc               postgresql.auto.conf
base                    pg_hba.conf             pg_notify               pg_stat                 pg_twophase             postgresql.conf
global                  pg_ident.conf           pg_replslot             pg_stat_tmp             pg_wal                  postmaster.opts
pg_commit_ts            pg_logical              pg_serial               pg_subtrans             pg_xact
postgresql@14 
Uninstalling /usr/local/Cellar/postgresql@14/14.15... (3,328 files, 44.7MB)
==> Autoremoving 1 unneeded formula:
krb5
Uninstalling /usr/local/Cellar/krb5/1.21.3... (163 files, 4.9MB)
stevepodell@Steves-MacBook-Air postgresql@14 % 

stevepodell@Steves-MacBook-Air postgresql@14 % ls -la
total 112
drwx------@ 25 stevepodell  admin    800 Mar 12 15:21 .
drwxrwxr-x@  7 stevepodell  admin    224 Mar 12 15:23 ..
-rw-------@  1 stevepodell  admin      3 Nov 26 09:10 PG_VERSION
drwx------@  6 stevepodell  admin    192 Nov 26 11:05 base
drwx------@ 60 stevepodell  admin   1920 Mar 12 14:57 global
drwx------@  2 stevepodell  admin     64 Nov 26 09:10 pg_commit_ts
drwx------@  2 stevepodell  admin     64 Nov 26 09:10 pg_dynshmem
-rw-------@  1 stevepodell  admin   4789 Nov 26 09:10 pg_hba.conf
-rw-------@  1 stevepodell  admin   1636 Nov 26 09:10 pg_ident.conf
drwx------@  5 stevepodell  admin    160 Mar 12 15:21 pg_logical
drwx------@  4 stevepodell  admin    128 Nov 26 09:10 pg_multixact
drwx------@  2 stevepodell  admin     64 Nov 26 09:10 pg_notify
drwx------@  2 stevepodell  admin     64 Nov 26 09:10 pg_replslot
drwx------@  2 stevepodell  admin     64 Nov 26 09:10 pg_serial
drwx------@  2 stevepodell  admin     64 Nov 26 09:10 pg_snapshots
drwx------@  6 stevepodell  admin    192 Mar 12 15:21 pg_stat
drwx------@  2 stevepodell  admin     64 Mar 12 15:21 pg_stat_tmp
drwx------@  3 stevepodell  admin     96 Nov 26 09:10 pg_subtrans
drwx------@  2 stevepodell  admin     64 Nov 26 09:10 pg_tblspc
drwx------@  2 stevepodell  admin     64 Nov 26 09:10 pg_twophase
drwx------@  4 stevepodell  admin    128 Nov 26 09:10 pg_wal
drwx------@  3 stevepodell  admin     96 Nov 26 09:10 pg_xact
-rw-------@  1 stevepodell  admin     88 Nov 26 09:10 postgresql.auto.conf
-rw-------@  1 stevepodell  admin  28729 Nov 26 09:10 postgresql.conf
-rw-------@  1 stevepodell  admin     87 Mar 12 14:55 postmaster.opts
stevepodell@Steves-MacBook-Air postgresql@14 % sudo rm -fr *
Password:
stevepodell@Steves-MacBook-Air postgresql@14 % ls -la
total 0
drwx------@ 2 stevepodell  admin   64 Mar 12 15:26 .
drwxrwxr-x@ 7 stevepodell  admin  224 Mar 12 15:23 ..
stevepodell@Steves-MacBook-Air postgresql@14 % 
```

### Reinstalling postgres, and initializing the database

