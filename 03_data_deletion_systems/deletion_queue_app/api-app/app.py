#Example Docker App using this resource:
#https://docs.docker.com/language/python/build-images/

from flask import Flask, render_template, request
from databaseConnection import DatabaseConnection

db = DatabaseConnection()

app = Flask(__name__)

base_url = '/api/v1'
requests_url = base_url + '/requests'

#---------
#---NEW---
#---------
@app.route(requests_url + '/new', methods=['POST'])
def add_requests():
    data = request.json

    #TODO: Validate payload here
    for item in data:
        db.add_new_by_email(email=item['email'],cause=item['cause'])

    return "New requests successfully added", 200

#-------------
#---PENDING---
#-------------
@app.route(requests_url + '/pending', methods=['GET'])
def read_pending_requests():
    return db.get_pending(), 200

@app.route(requests_url + '/pending/<id>', methods=['POST'])
def edit_pending_requests(id):

    print(request.json)
    #If any data attached:
    if request.data:
        #TODO: Check data formats & structures
        db.edit_pending_by_id(id,**request.json)
        return f"Attributes changed for id {id}\n", 200
    else:
        return "Error: No attributes provided in JSON request body\n", 400

#--------------
#---FINISHED---
#--------------
@app.route(requests_url + '/finished', methods=['POST'])
def read_finished_requests():
    return "huhu!"


#------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)