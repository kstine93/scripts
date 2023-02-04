#!bin/bash
#
# Note: This script only intended to create practice local database. Not for production
#

psql postgresql://postgres:postgres@localhost:5432/postgres -c "CREATE DATABASE practice_db;"
#exit