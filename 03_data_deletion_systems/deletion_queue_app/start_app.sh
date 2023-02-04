#!bin/bash

#----------------------
#---Common functions---
#----------------------

report_err()
{
    echo "Error: $1"
}

#--------------------
#---Database Setup---
#--------------------

echo "\n--- Starting Docker Container ---"
sudo docker-compose -f test_db_setup/docker-compose.yaml up -d

echo "\n--- Creating Database ---"
sh test_db_setup/database-setup.sh || report_err "Database creation failed - ignore this error if database already exists"

#--------------------------
#---Starting Application---
#--------------------------

#Starting API
echo "\n--- Starting API ---"
python3 api-app/app.py || exit 1
echo "\n--- Closing API ---"

#------------------------
#---Cleaning up System---
#------------------------

#NOTE: This command does not get executed since exiting from Flask forwarding used in app.py aborts this entire script.
#Once this is in production mode, need to find better way to ensure this entire script gets executed. -Kevin, Feb. 4, 2023
echo "\n--- Stopping Docker Container ---"
sudo docker-compose -f test_db_setup/docker-compose.yaml down