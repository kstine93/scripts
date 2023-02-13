from test_utils import test_request

baseUrl = "/api/v1/requests"
baseHeader = {"Content-Type":"application/json"}

#-----------------------
#---Finished Requests---
#-----------------------

def test_finishedRequests_noDates_normal(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/finished"
    )

def test_finishedRequests_withDates_normal(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/finished"
        ,body={"startDate":"2022-01-01","endDate":"2023-12-30"}
    )

def test_finishedRequests_withDates_reversedDateFormat(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/finished"
        ,body={"startDate":"01-01-2022","endDate":"12-30-2022"}
    )

def test_finishedRequests_withDates_onlyStartDate(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/finished"
        ,body={"startDate":"2022-01-01"}
    )

def test_finishedRequests_withDates_onlyEndDate(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/finished"
        ,body={"endDate":"2023-12-30"}
    )

def test_finishedRequests_withDates_misnamedField(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/finished"
        ,body={"wrongDate":"2022-01-01"}
    )

#------------------
#---New Requests---
#------------------
def test_newRequest_normal(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/new"
        ,body=[{"email":"test@email.de","request_cause":"direct_request"}]
        ,headers=baseHeader
    )

def test_newRequest_bulk(api_host: str,count: int=100):
    body = [{"email":f"em_{i}@test.de","request_cause":"direct_request"} for i in count]
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/new"
        ,body=body
        ,headers=baseHeader
    )

def test_newRequest_allCauses(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/new"
        ,body=[
            {"email":"test@email.de","request_cause":"direct_request"}
            ,{"email":"test2@email.de","request_cause":"account_deleted"}
            ,{"email":"test3@email.de","request_cause":"email_opt_out"}
            ,{"email":"test4@email.de","request_cause":"inactive"}
            ,{"email":"test5@email.de","request_cause":"other"}
        ]
        ,headers=baseHeader
    )

def test_newRequest_blankEmail(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/new"
        ,body=[{"email":" ","request_cause":"direct_request"}]
        ,headers=baseHeader
    )

def test_newRequest_blankCause(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/new"
        ,body=[{"email":" ","request_cause":" "}]
        ,headers=baseHeader
    )

def test_newRequest_misnamedField(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/new"
        ,body=[{"email":"test@email.de","wrong_cause":"direct_request"}]
        ,headers=baseHeader
    )

def test_newRequest_missingCause(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/new"
        ,body=[{"email":"test@email.de"}]
        ,headers=baseHeader
    )

#----------------------
#---Pending Requests---
#----------------------
def test_pendingRequests_get_normal(api_host: str):
    return test_request(
        method="GET"
        ,url=f"{api_host}{baseUrl}/pending"
    )

def test_pendingRequests_approve_id(api_host: str, id: int = 1):
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/pending/{id}"
        ,body={"rejected":"True"}
        ,headers=baseHeader
    )

def test_pendingRequests_reject_id(api_host: str, id: int = 1):
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/pending/{id}"
        ,body={"rejected":"False"}
        ,headers=baseHeader
    )

def test_pendingRequests_change_cause(api_host: str, id: int = 1):
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/pending/{id}"
        ,body={"request_cause":"direct_request"}
        ,headers=baseHeader
    )

def test_pendingRequests_wrongDataFormat(api_host: str, id: int = 1):
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/pending/{id}"
        ,body={"rejected":True}
        ,headers=baseHeader
    )

def test_pendingRequests_wrongId(api_host: str):
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/pending/-1"
        ,body={"rejected":"False"}
        ,headers=baseHeader
    )

def test_pendingRequests_invalidCause(api_host: str, id: int = 1):
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/pending/{id}"
        ,body={"request_cause":"invalid cause!"}
        ,headers=baseHeader
    )

def test_pendingRequests_misnamedField(api_host: str, id: int = 1):
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/pending/{id}"
        ,body={"mIsNaMeD_FiElD":"True"}
        ,headers=baseHeader
    )

def test_pendingRequests_emptyBody(api_host: str, id: int = 1):
    return test_request(
        method="POST"
        ,url=f"{api_host}{baseUrl}/pending/{id}"
        ,body={}
        ,headers=baseHeader
    )