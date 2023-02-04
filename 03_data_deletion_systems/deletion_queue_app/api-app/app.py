#Example Docker App using this resource:
#https://docs.docker.com/language/python/build-images/

from flask import Flask, render_template, request
#Flask intro: https://flask.palletsprojects.com/en/2.1.x/quickstart/
#Flask allows us to create a web server (like Express.js?), it seems
#Note: "localhost resolves to 127.0.0.1"

#Note: __name__ gives information on the execution context
#If __name__ == __main__, this is the primary script. Else, it's a support script.
app = Flask(__name__)

base_url = '/api/v1'
requests_url = base_url + '/requests'

#---------
#---NEW---
#---------
@app.route(requests_url + '/new', methods=['POST'])
def add_requests():
    data = request.json
    #Note: expects json like: [{"email":"test@email.de","cause":"direct_request"}{"email"...}]
    #How to validate this in Flask? Look at express API I was working on with Jan?

    #Next Steps:
    #1. Implement database_connection class
    #2. Create instance of database connection class here
    #3. Store input in database (probably best to iterate over list here and provide JSON to class method)
    #4. Find way to validate payload structure in Flask.
    return data[0]['cause']
    #python3 -m flask run
    #Nav to http://localhost:5000/
    #Default port is 5000

#-------------
#---PENDING---
#-------------
@app.route(requests_url + '/pending', methods=['GET'])
def read_pending_requests():
    return "Hello there!" #render_template("index.html")

@app.route(requests_url + '/pending/<request_id>')
def edit_pending_requests(request_id):
    return f'{request_id}\'s profile'

#--------------
#---FINISHED---
#--------------
@app.route(requests_url + '/finished', methods=['POST'])
def read_finished_requests():
    return "huhu!"


#------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)