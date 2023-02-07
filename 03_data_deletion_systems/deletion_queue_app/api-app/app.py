#Example Docker App using this resource:
#https://docs.docker.com/language/python/build-images/

from typing import Type

from flask import Flask, render_template, request

from databaseConnection import DatabaseConnection

from marshmallow import ValidationError
from validation import *

#----------------
db = DatabaseConnection()

#----------------
app = Flask(__name__)
base_url = '/api/v1'
requests_url = base_url + '/requests'

#---------
#---NEW---
#---------
@app.route(requests_url + '/new', methods=['POST'])
def add_requests():

    #Validating Payload
    try:
        data = NewRequestSchema(many=True).load(data=request.json)
    except ValidationError as err:
        return err.messages_dict, 400

    #Adding data to database
    for item in data:
        db.add_new_by_email(email=item['email'],cause=item['request_cause'])

    return "New requests successfully added\n", 200

#-------------
#---PENDING---
#-------------
@app.route(requests_url + '/pending', methods=['GET'])
def read_pending_requests():
    return db.get_pending(), 200

#--------------
@app.route(requests_url + '/pending/<id>', methods=['POST'])
def edit_pending_requests(id):

    #If any data attached:
    if request.data:

        #Validating Payload
        try:
            data = EditPendingSchema(many=False).load(data=request.json)
        except ValidationError as err:
            return err.messages_dict, 400

        #Updating Data
        try:
            db.edit_pending_by_id(id,**request.json)
            return f"Attributes changed for id {id}\n", 200
        except Exception as err:
            return str(err), 400

    else:
        return "Error: No attributes provided in JSON request body\n", 400

#--------------
#---FINISHED---
#--------------
@app.route(requests_url + '/finished', methods=['POST'])
def read_finished_requests():

    #If any data attached:
    if request.data:

        #Validating Payload
        try:
            data = GetFinishedByDate(many=False).load(data=request.json)
        except ValidationError as err:
            return err.messages_dict, 400

        try:
            return db.get_finished_by_date(data['startDate'],data['endDate']), 200
        except Exception as err:
            return str(err), 400

    else:
        return db.get_finished(), 200


#------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)