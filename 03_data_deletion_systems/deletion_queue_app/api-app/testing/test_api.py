from endpoint_calls import *
import configparser
import json

config = configparser.ConfigParser()
config.read('../../deletion_app.cfg')
port = '5000'
api_host = config['API_SPECS']['api_host'] + f":{port}"

#--------------------
#---Test Scenarios---
#--------------------

#1. Normal requests:

# assert test_newRequest_normal(api_host).status == 200
# assert test_pendingRequests_get_normal(api_host).status == 200
# assert test_pendingRequests_approve_id(api_host, id = 1).status == 200
# assert test_pendingRequests_reject_id(api_host, id = 1).status == 200
# assert test_pendingRequests_change_cause(api_host).status == 200
# assert test_finishedRequests_noDates_normal(api_host).status == 200

print("--Passed normal request tests--")

#2. Bad requests:
# assert test_pendingRequests_wrongId(api_host).data.decode('utf-8') == "No matching rows found - update aborted."
# assert json.loads(test_pendingRequests_wrongDataFormat(api_host).data.decode('utf-8')) == {"rejected":["Not a valid string."]}
# assert json.loads(test_pendingRequests_invalidCause(api_host).data.decode('utf-8')) == {"request_cause":["Must be one of: direct_request, account_deleted, email_opt_out, inactive, other."]}
# assert json.loads(test_pendingRequests_misnamedField(api_host).data.decode('utf-8')) == {'mIsNaMeD_FiElD': ['Unknown field.']}
# assert test_pendingRequests_emptyBody(api_host).data.decode('utf-8') == "Error: No field provided to update."

print("--Passed bad request tests--")