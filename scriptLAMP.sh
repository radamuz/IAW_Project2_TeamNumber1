#!/bin/bash

# Start the script with root privileges.
# This script is used to create a LAMP (Linux+Apache+MySQL+PHP) server in Google CloudShell

# Checking number of parameters. It does not have to receive any parameters.
if `test $# -lt 0` || `test $# -gt 0`
then
        echo "Incorrect number of parameters.";
        echo "This script does not support parameters.";
        echo "Use: $0";
        exit 1;
fi

# Updating repositories
sudo apt update

# Install apache2
sudo apt install apache2 -y

# Configure port 8080
sudo rm /etc/apache2/ports.conf
sudo cat > /etc/apache2/ports.conf <<EOF 
# 
# If you just change the port or add more ports here, you will likely also
# have to change the VirtualHost statement in
# /etc/apache2/sites-enabled/000-default.conf

Listen 8080

<IfModule ssl_module>
        Listen 443
</IfModule>

<IfModule mod_gnutls.c>
        Listen 443
</IfModule>
EOF

# Reset apache
sudo /etc/init.d/apache2 restart


# Install and configure MySQL
sudo apt install mysql-server -y

# Configure MySQL
sudo mysql_secure_installation

# Start mysql server
sudo /etc/init.d/mysql start
# To enter to mysql: sudo mysql -p
# Pass: 1234


# Install and configure PHP
sudo apt install php libapache2-mod-php php-mysql php-mbstring -y
# php -v to see the version


# Install and configure phpMyAdmin
sudo apt install phpmyadmin -y

# Create new VirtualHost configuration file for phpMyAdmin.
# Configure port 8081
sudo rm /etc/apache2/sites-available/phpmyadmin.conf
sudo cat > /etc/apache2/sites-available/phpmyadmin.conf <<EOF 
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
EOF

# Switch Apache's configuration and restart it.
sudo a2disconf phpmyadmin
sudo a2ensite phpmyadmin


# Restart apache2
sudo service apache2 restart


# Download wordpress and give it permissions
cd /tmp/
wget -c https://wordpress.org/latest.tar.gz
tar -xvzf latest.tar.gz
sudo mv wordpress/ /var/www/html/
sudo chown -R www-data:www-data /var/www/html/wordpress/
sudo chmod 755 -R /var/www/html/wordpress/

# Configuring VirtualHost for WordPress
# Create new VirtualHost configuration file for phpMyAdmin.
# Configure port 8082
sudo rm /etc/apache2/sites-available/wordpress.conf
sudo cat > /etc/apache2/sites-available/wordpress.conf <<EOF 
Listen 8082
<VirtualHost *:8082>
      DocumentRoot /var/www/html/wordpress
     ServerName localhost

     <Directory /var/www/html/wordpress>
          Options FollowSymlinks
          AllowOverride All
          Require all granted
     </Directory>

     ErrorLog ${APACHE_LOG_DIR}/your-domain.com_error.log
     CustomLog ${APACHE_LOG_DIR}/your-domain.com_access.log combined

</VirtualHost>
EOF

# Switch WordPress configuration and restart it.
sudo ln -s /etc/apache2/sites-available/wordpress.conf /etc/apache2/sites-enabled/wordpress.conf
sudo a2enmod rewrite

# Restart apache2
sudo service apache2 restart


exit 0;