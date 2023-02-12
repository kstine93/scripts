#File for testing API via Python

import urllib3
import configparser

config = configparser.ConfigParser()
config.read('../../deletion_app.cfg')
api_host = config['API_SPECS']['api_host']

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
        print(str_break)
        
        return response
    return wrapper


@print_test_output
def test_request(method: str, url: str, **request_args):
    
    http = urllib3.PoolManager()
    response = http.request(method=method,url=url,fields=request_args['fields'])

    return response


#--------------------
#---Endpoint Calls---
#--------------------

#--- Finished Requests ---
def test_finishedRequests_noDates_normal(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}/api/v1/requests/new"
    )

def test_finishedRequests_withDates_normal(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}/api/v1/requests/new"
        ,fields={"startDate":"2022-01-01","endDate":"2023-12-30"}
    )

def test_finishedRequests_withDates_reversedDateFormat(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}/api/v1/requests/new"
        ,fields={"startDate":"01-01-2022","endDate":"12-30-2022"}
    )

def test_finishedRequests_withDates_onlyStartDate(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}/api/v1/requests/finished"
        ,fields={"startDate":"2022-01-01"}
    )

def test_finishedRequests_withDates_onlyEndDate(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}/api/v1/requests/finished"
        ,fields={"endDate":"2023-12-30"}
    )

def test_finishedRequests_withDates_misnamedField(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}/api/v1/requests/finished"
        ,fields={"wrongDate":"2022-01-01"}
    )

#--- New Requests ---
def test_newRequest_normal(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}/api/v1/requests/new"
        ,fields=[
            {"email":"test@email.de","request_cause":"direct_request"}
            ,{"email":"test2@email.de","request_cause":"inactive"}
        ]
    )

def test_newRequest_bulk(api_host: str,count: int=100):
    fields = [{"email":f"em_{i}@test.de","request_cause":"direct_request"} for i in count]
    return test_request(
        method="POST"
        ,url=f"{api_host}/api/v1/requests/new"
        ,fields=fields
    )

def test_newRequest_allCauses(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}/api/v1/requests/new"
        ,fields=[
            {"email":"test@email.de","request_cause":"direct_request"}
            ,{"email":"test2@email.de","request_cause":"account_deleted"}
            ,{"email":"test3@email.de","request_cause":"email_opt_out"}
            ,{"email":"test4@email.de","request_cause":"inactive"}
            ,{"email":"test5@email.de","request_cause":"other"}
        ]
    )

def test_newRequest_noEmail(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}/api/v1/requests/new"
        ,fields=[{"email":" ","request_cause":"direct_request"}]
    )

def test_newRequest_misnamedField(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}/api/v1/requests/new"
        ,fields=[{"email":"test@email.de","wrong_cause":"direct_request"}]
    )

def test_newRequest_missingCause(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}/api/v1/requests/new"
        ,fields=[{"email":"test@email.de"}]
    )