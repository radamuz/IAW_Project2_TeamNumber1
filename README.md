# LAMP and Docker deployment
### Linux, Apache, MySQL, PHP, PHPMyAdmin and Wordpress
|            Main information        ||
| :---        |    :----:   | 
| Authors     | Raúl Adamuz   |
|             | Jordi Álvarez |
|             | Carlos Aguilar |
| Emails      | <radamuz@cifpfbmoll.eu> |
|             | <jalvarez@cifpfbmoll.eu>|
|             | <caguilar@cifpfbmoll.eu>|
| Title       | Online clothing store |
| Project num. |    2         |
| Date        | 26/10/2020    |
| Professional family | Computers and Communications |
| Training Cycle |       CFGS     |
| Course      | 2nd ASIX      |
| Subject     | Web Applications Implementation |
| Teacher     | Miquel Àngel Cabot  |
  
---

## The project
### Short description
We must create the website of an online clothing store with a Content Management System (CMS).
For this purpose, we will need to install the Wordpress CMS and the WooCommerce e-commerce plugin, installed on a LAMP stack, and deploy it with Docker.

### Docker deployment
To manage the deployment correctly follow the following points:

* In order to start the container in Docker Compose, we launch the following command:
```
docker-compose up -d
```

* In order to stop all containers we launch the following command:
```
docker-compose down --volumes
```

* To enter a container interactively, we will launch the following command:
```
docker exec -it [containerID] /bin/bash
```

* To set a specific Wordpress URL, change ``%YOUR_URL%`` to your URL and add these lines to the end of the ``wp-config.php`` file located at ``./wordpress/``;
```
define('WP_HOME','%YOUR_URL%');
define('WP_SITEURL','%YOUR_URL%');
$_SERVER['HTTP_HOST'] = $_SERVER['HTTP_X_FORWARDED_HOST'];
```
