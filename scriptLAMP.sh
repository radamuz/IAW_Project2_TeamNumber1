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

# 

