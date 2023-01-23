#Example Docker App using this resource:
#https://docs.docker.com/language/python/build-images/

from flask import Flask, render_template, request
#Flask intro: https://flask.palletsprojects.com/en/2.1.x/quickstart/
#Flask allows us to create a web server (like Express.js?), it seems
#Note: "localhost resolves to 127.0.0.1"

#Note: __name__ gives information on the execution context
#If __name__ == __main__, this is the primary script. Else, it's a support script.
app = Flask(__name__)


#---------
#---NEW---
#---------
@app.route('api/v1/requests/new', methods=['POST'])
def add_requests():
    data = request.json
    return "data"
    #python3 -m flask run
    #Nav to http://localhost:5000/
    #Default port is 5000

#-------------
#---PENDING---
#-------------
@app.route('api/v1/requests/pending', methods=['GET'])
def read_pending_requests():
    return render_template("index.html")

@app.route('/api/v1/reqeusts/pending/<request_id>')
def edit_pending_requests(request_id):
    return f'{request_id}\'s profile'

#--------------
#---FINISHED---
#--------------
@app.route('api/v1/requests/pending', methods=['POST'])
def read_finished_requests():
    return "huhu!"


#------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)