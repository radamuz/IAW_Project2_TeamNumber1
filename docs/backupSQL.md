# Backup
```
docker exec CONTAINER /usr/bin/mysqldump -u root --password=PASS DATABASE > backup.sql
```

# Restore
```
cat backup.sql | docker exec -i CONTAINER /usr/bin/mysql -u root --password=PASS DATABASE
```

# Adding to crontab
```
crontab -e
```

## Add this line:
```
* * * * * /usr/bin/docker exec iawproject2teamnumber1_db_1 /usr/bin/mysqldump -u root --password=Alumne1234* wordpress > /home/raul/IAW_Project2_TeamNumber1/sql/wordpress.sql
```
