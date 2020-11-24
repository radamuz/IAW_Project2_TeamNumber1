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
sudo crontab -e
```

## Add this line:
```
10 * * * * /usr/bin/docker exec iawproject2teamnumber1_wordpress_1 /usr/bin/mysqldump -u root --password=Alumne1234* wordpress > /home/raul/IAW_Project2_TeamNumber1/sql/wordpress.sql
```
