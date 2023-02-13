#File for testing API via Python

import urllib3
import json

#Purpose: Let's make a general function to send requests to our endpoint
#and receive responses. Then, we can make specific functions to test payload
# + endpoint configurations and check that the response works
#NOTE: Make wrapper function to give output to allow us to run this manually
#or in an automated way.

#NOTE: can I have 'soft failures' when an HTTP response code is correct, but
#the message has changed (indicating that an update is needed, but that things
# are still working o.k.)?

def print_test_output(func):
    #wrapper function to print some output for users during testing of requests:
    def wrapper(**kwargs):
        str_break = "---------------"
        response_vars_to_print = ['status','data']

        print(str_break)
        print("----TESTING----")
        for key in kwargs:
            print(f"{key}: {kwargs[key]}")

        response = func(**kwargs)

        print(f"status: {response.status}")
        print(f"data: {response.data.decode('utf-8')}")
        
        return response
    return wrapper


@print_test_output
def test_request(method: str, url: str, **request_args):

    body = json.dumps(request_args['body']) if 'body' in request_args else None
    headers = request_args['headers'] if 'headers' in request_args else None
    
    http = urllib3.PoolManager()
    response = http.request(
        method=method
        ,url=url
        ,body=body
        ,headers=headers
    )

    return response