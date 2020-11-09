# Instructions to install LAMP
## LAMP, PHPMyAdmin and Wordpress
### We can do both manual and automatic installation.
#### Automatic installation

We have developed a script that allows us to install Apache, MySQL, PHP, PHPMyAdmin and Wordpress automatically in Google Cloudshell with Debian 10 buster.  

To start the script you just have to start the ``scriptLAMP.sh`` file with administrator privileges:
```
sudo ./scriptLAMP.sh
```

#### Manual installation
1. Update repositories:
```
sudo apt update
```

2. Install apache2:
```
sudo apt install apache2 -y
```

3. We configure port 8080 for apache leaving the ``/etc/apache2/ports.conf`` file like this:
```
Listen 8080

<IfModule ssl_module>
        Listen 443
</IfModule>

<IfModule mod_gnutls.c>
        Listen 443
</IfModule>
```

4. Reset apache:
```
sudo /etc/init.d/apache2 restart
```

5. We install MySQL:
```
sudo apt install mysql-server -y
```

6. Start mysql server:
```
sudo /etc/init.d/mysql start
```

7. If we want we can ensure the installation of MySQL with the following command:
```
sudo mysql_secure_installation
```

8. We install PHP:
```
sudo apt install php libapache2-mod-php php-mysql php-mbstring -y
```

9. We install PHPmyAdmin:
```
sudo apt install phpmyadmin -y
```

10. We add a virtualhost for PHPmyAdmin in the following file ``/etc/apache2/sites-available/phpmyadmin.conf``:
```
Listen 8081

<VirtualHost *:8081>

    ServerName localhost

    <Directory /usr/share/phpmyadmin>
            AllowOverride None
            Require all granted
    </Directory>

    DocumentRoot /usr/share/phpmyadmin

    Include /etc/phpmyadmin/apache.conf

    ErrorLog ${APACHE_LOG_DIR}/phpmyadmin.error.log
    CustomLog ${APACHE_LOG_DIR}/phpmyadmin.access.log combined

</VirtualHost>
```

11. We enable the phpmyadmin virtualhost and restart apache:
```
sudo a2disconf phpmyadmin;
sudo a2ensite phpmyadmin;
sudo service apache2 restart;
```

12. Download wordpress and give it permissions:
```
cd /tmp/;
wget -c https://wordpress.org/latest.tar.gz;
tar -xvzf latest.tar.gz;
mv wordpress/ /var/www/html/;
chown -R www-data:www-data /var/www/html/wordpress/;
chmod 755 -R /var/www/html/wordpress/;
```

13. We add a virtualhost for Wordpress in the following file ``/etc/apache2/sites-available/wordpress.conf``:
```
<VirtualHost *:8080>
    DocumentRoot /var/www/html/wordpress
    ServerName localhost

    <Directory /var/www/html/wordpress>
        Options FollowSymlinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog /your-domain.com_error.log
    CustomLog /your-domain.com_access.log combined
</VirtualHost>
```

14. We enable the Wordpress site in apache2:
```
ln -s /etc/apache2/sites-available/wordpress.conf /etc/apache2/sites-enabled/wordpress.conf;
a2enmod rewrite;
```


15. To make the URL of the Wordpress site point to the Cloudshell, we will add these lines at the end of the file ``wp-config.php`` located in ``/var/www/html/wordpress/``:
```
define('WP_HOME','https://8080-cs-862474600027-default.europe-west1.cloudshell.dev');
define('WP_SITEURL','https://8080-cs-862474600027-default.europe-west1.cloudshell.dev');
$_SERVER['HTTP_HOST'] = $_SERVER['HTTP_X_FORWARDED_HOST'];
```

16. We restart apache:
```
sudo service apache2 restart
```

17. Access mysql to later create the wordpress database:
```
sudo mysql -u root -p
```

18. Create the wordpress database:
```
CREATE DATABASE wordpress;
exit;
```

19. Finally configure Wordpress in the URL: <https://8080-cs-862474600027-default.europe-west1.cloudshell.dev>