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
1. Update repositories
```
sudo apt update
```

2. Install apache2
```
sudo apt install apache2 -y
```

3. 