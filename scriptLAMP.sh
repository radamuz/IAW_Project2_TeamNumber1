#!/bin/bash

# This script is used to create a LAMP (Linux+Apache+MySQL+PHP) server in Google CloudShell

# Checking number of parameters. It does not have to receive any parameters.
if `test $# -lt 0` || `test $# -gt 0`
then
        echo "Incorrect number of parameters.";
        echo "This script does not support parameters.";
        echo "Use: $0";
        exit 1;
fi

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