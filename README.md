# LAMP and Docker deployment
### Linux, Apache, MySQL, PHP, PHPMyAdmin and Wordpress

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
