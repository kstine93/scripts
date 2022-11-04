/*
---
Title: Function Library - QualtricsAPIFunctions.gs
Authors:
* Kevin Stine (unless otherwise specified in code below)
---------------------------------------
Purpose: This script is a function library focusing on functions necessary for interacting with the Qualtrics API (e.g. retrieving survey data,
retrieving panel data, deleting data etc.)

Last Updated: Aug. 27. 2021
---
*/

//--------------------------------------
//--- Get Qualtrics Survey Responses ---
//--------------------------------------

//--------------------------------
function getSurveyData_startExport_(surveyID,token,payload) {
  //PURPOSE:
  //  This function requests Qualtrics to start the process of survey data export from Zalando's Qualtrics domain.
  //ARGUMENTS:
  //  surveyID = ID of the Qualtrics survey (starts with "SV_" typically)
  //  token = Qualtrics API token
  //  payload = body of the POST request. In this payload, Qualtrics allows users to specify how to export the data (filters, format)
  //    See Qualtrics' API documentation for more information on how to create this.
  //RETURNS:
  //  Progress ID - a Qualtrics identifier which allows the user to check the progress of the export
  //
  const url = "https://zalandomafo.eu.qualtrics.com/API/v3/surveys/"+surveyID+"/export-responses"
  const headers = {"X-API-TOKEN":token}
    
  const params = {"headers":headers,
                "payload":JSON.stringify(payload),
                "method":"post",
                "contentType":"application/json"
                }
                
  const response = JSON.parse(UrlFetchApp.fetch(url,params))
  if (response['meta']['httpStatus'] == '200 - OK'){
    return response['result']['progressId']
  }
  else throw "Error: Qualtrics unable to start survey data export."
}

//--------------------------------
function getSurveyData_getProgress_(surveyID,token,progressID,waitSeconds = 2){
  //PURPOSE:
  //  This function checks on the status of an already-initiated survey data export.
  //  This function checks every 2 seconds until the export is
  //ARGUMENTS:
  //  surveyID = ID of the Qualtrics survey being exported (starts with "SV_" typically)
  //  token = Qualtrics API token 
  //  progressID = This ID is provided upon the creation of an export request. In this function it
  //    tells Qualtrics which export we are interested in checking the progress of
  //RETURNS:
  //  File ID - which allows the user to retrieve the completed data file from Qualtrics
  //
  const url = "https://zalandomafo.eu.qualtrics.com/API/v3/surveys/"+surveyID+"/export-responses/"+progressID
  const headers = {"X-API-TOKEN":token}
  const params = {"headers":headers}
  let response = null
  
  do{
    response = JSON.parse(UrlFetchApp.fetch(url,params))
    Utilities.sleep(waitSeconds * 1000); //Waiting for some amount of time to not barrage Qualtrics with requests
  } while(response['result']['percentComplete'] < 100)

  return response['result']['fileId']
}

//--------------------------------
function getSurveyData_getFile_(surveyID,token,fileID){
  //PURPOSE:
  //  Retrieve a completed survey data file from Qualtrics
  //ARGUMENTS:
  //  surveyID = ID of the Qualtrics survey being exported (starts with "SV_" typically)
  //  token = Qualtrics API token
  //  fileID = This ID is provided upon the completion of an export request. In this function it
  //    tells Qualtrics which data file we now want to retrieve
  //RETURNS:
  //  API call response containing the requested export data
  //
  const url = "https://zalandomafo.eu.qualtrics.com/API/v3/surveys/"+surveyID+"/export-responses/"+fileID+"/file"
  const headers = {"X-API-TOKEN":token}
  const params = {"headers":headers,"method":"get"}

  return UrlFetchApp.fetch(url, params);
}
//================================END================================

//--------------------------------------
//--- Get Qualtrics Survey Responses ---
//--------------------------------------

//--------------------------------
function getPaginatedQualtricsData_(url, params){
  //PURPOSE:
  //  Iteratively pulls in Qualtrics data which uses pagination (e.g. first 100 results, then the next 100, etc.)
  //ARGUMENTS:
  //  url = the URL of the API endpoint. Typically also specifies the type of request.
  //  params = parameters to be used in the API call. Note that this INCLUDES the header containing the API token
  //RETURNS:
  //  Complete list of requested data as an array
  //

  let returnList = []
  let response = null

  //Continue to call API until there are no more pages to get:

  do{
    response = JSON.parse(UrlFetchApp.fetch(url,params))
    url = response['result']['nextPage'];
    returnList = [...returnList,...response['result']['elements']]
  } while (response['meta']['httpStatus'] == "200 - OK" && url != null)

  return returnList 
}

//================================END================================

//--------------------------------------
//--- Get Qualtrics Survey Meta-Data ---
//--------------------------------------

//--------------------------------
function getSurveyMetaData_(surveyID,token){
  //PURPOSE:
  //  Retrieves the meta information about a survey from Qualtrics
  //ARGUMENTS:
  //  surveyID = ID of the Qualtrics survey we want the name of (starts with "SV_" typically)
  //  token = Qualtrics API token
  //RETURNS:
  //  Plain-text survey name
  //
  const url = "https://zalandomafo.eu.qualtrics.com/API/v3/survey-definitions/"+surveyID+"/metadata"
  const headers = {"X-API-TOKEN":token}
  const params = {"headers":headers,"method":"get"}

  const response = JSON.parse(UrlFetchApp.fetch(url, params))

  return response['result']
}

//--------------------------------
function getSurveyName_(surveyID,token){
  //PURPOSE:
  //  Retrieves the plain-text name of a survey from Qualtrics
  //ARGUMENTS:
  //  surveyID = ID of the Qualtrics survey we want the name of (starts with "SV_" typically)
  //  token = Qualtrics API token
  //RETURNS:
  //  Plain-text survey name
  //

  return getSurveyMetaData_(surveyID,token)['SurveyName']
}

//================================END================================
