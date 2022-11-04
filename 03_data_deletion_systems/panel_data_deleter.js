/*
=== DataDeleter.gs ===
PURPOSE: This script's purpose is to delete the data of individuals in the Qualtrics XM directory belonging to the
quantitative User Research Team - in other words, data from Zalando Voices members. This script only operates in
conjunction with the 'requests' tab of the 'data deleter' spreadsheet:
https://docs.google.com/spreadsheets/d/1ZSQ_o2KurGlV1TzJj2FL9Z_7P90onV23xb4B5yuYxRc/edit#gid=0
This script works by (1) pulling in a list of Zalando Voices members who have been flagged for deletion
(2) identifying which surveys those members took during their time in ZV, (3) deleting (or anonymizing) these
survey data and (4) deleting the contact from the XM Directory.

AUTHOR(S): Kevin Stine

LAST UPDATED: Nov. 23, 2020

NOTE: I discovered through testing that if a contact is deleted from Qualtrics, their survey response information is STILL kept, for at least a few days.
It's unclear to me how long these data are kept, but it's at least 1 week. The relevance of this
to the current task is that even if a contact is deleted, as long as we still have the contact ID, we may still be able to reference survey activity data.
*/

//--------------------------------
//---Defining Global Variables:---
//--------------------------------
//Setting Indices & meta-data of the "RequestsToProcess" named range
var RTP_indexIndex = 0 //Column with unique ID (currently just row number for simplicity)
var RTP_contactIndex = 1 //Column holding Qualtrics Contact ID
var RTP_emailIndex = 2 // Email
var RTP_actionIndex = 3 //Is either "delete" or "anonymize" - showing what should be done with the record
var RTP_requestedDateIndex = 4 //When the deletion/anonymization was requested - for auditing purposes
var RTP_reasonIndex = 5 //Internal note of why deletion/anonymization was requested
var RTP_toggleIndex = 6 //TRUE or FALSE - indicates whether this script should process the record or not
var RTP_firstDataRow = 4 // Data in the Google Sheet might not start on row 1 (due to headers, etc.). What row does the data start on? Note: This is '4' instead of '3' because row 3 is a dummy (example) entry


//--------------------------------
//Setting Qualtrics-Related Global Variables:
var directoryHeader = {"X-API-TOKEN":getQualtricsApiKey_()}
//These http codes represent acceptable results from our data deletion/anonymization queries (survey or directory)
//Currently this includes success (200) and 'not found' (404) because not found means there's nothing to delete.
var whitelistedHttpCodes = ["404 - Not Found","200 - OK"]

/* !!! IMPORTANT !!!*/
//Toggle this value between "get" and "delete" to toggle between testing mode ("get") and production mode ("delete")
var qualtricsAction = "delete"
/* !!! IMPORTANT !!!*/

//--------------------------------
//Setting General Global Variables:
var today = new Date();
var ui = SpreadsheetApp.getUi()

//--------------------------------
//----Defining Core Functions:----
//--------------------------------
function prepRequests(){
  SpreadsheetApp.getActiveSpreadsheet().toast("Getting requests...", "Status", 5) //Notifying
  var activeRequests = getData_("RequestsToProcess",initialRow = RTP_firstDataRow)
  activeRequests = activeRequests.filter(x => x[RTP_toggleIndex]) //keep if 'true'

  //Some code to make sure that users fill out the ENTIRE data row when making requests:
  var valuesMissing = activeRequests.filter(row => {
    return row.slice(RTP_actionIndex,RTP_reasonIndex+1).includes("")
  })
  if(valuesMissing.length > 0){
    ui.alert("Error: Missing Data",`Please make sure every request has the following data and try again:\n
    1. A "Contact ID" OR "Email Address"
    2. "Request" ("Anonymize" or "Delete")
    3. "Request Date"- when the customer requested deletion/anonymization
    4. "Reason" for deletion (see Intro tab for details)`,ui.ButtonSet.OK_CANCEL)

    SpreadsheetApp.getActiveSpreadsheet().toast("Requests Processing Cancelled", 'Status', 3);
    return;
  }

  //If NOT in testing mode with qualtricsAction == 'get', double-checking whether user wants to continue with processing:
  if(qualtricsAction != "get"){
    message = "After this process is finished, you will no longer be able to find these customers' data in Qualtrics. \
    Please ensure you have completed other deletion tasks (e.g. deleting Krealinks account) first.\
    \n\nContinue deleting/anonymizing data from {num} contact(s)?"
    response = ui.alert("Warning: Deletion/Anonymization of Customer Data",message.replace(/{num}/g,activeRequests.length), ui.ButtonSet.YES_NO);
    if (response == ui.Button.NO){
      SpreadsheetApp.getActiveSpreadsheet().toast("Requests Processing Cancelled", 'Status', 3);
      return;
    }
  }
  
  //NOTE: Anonymization is much more complicated to implement than deletion. Rather than asking Qualtrics to simply delete 1 response, we
  //will likely be required with anonymization to (1) read in the survey response, (2) identify which data points carry PII (most difficult part),
  //(3) change these data points to be blank (or to be "redacted"), (4) ask qualtrics to update the response with these values
  //At this point, my primary concern is getting this up and running and so, as a quick fix, I am asking all anonymization requests to instead be deleted.
  //If this changes in the future, implement the solution in the 'anonymizeSurveyData_' function in this script. You can then completely remove the following
  // code (between '//----------------' and the function 'ChangeAnonymizeToDelete'
  // - Kevin Nov. 12, 2020
  //----------------
  if(activeRequests.map(x => x[RTP_actionIndex]).includes("Anonymize")){
    //Notifying user that anonymization not yet implemented
    var message = "Hey! Unfortunately, anonymization isn't working yet & this script can only delete data. \
    If you click 'OK' below, this script will turn all of your 'anonymize' requests into 'delete' requests. \
    \nIf you don't want that, click 'CANCEL' and this script will abort."
    var response = ui.alert("Warning: Deletion Instead of Anonymization",message, ui.ButtonSet.OK_CANCEL);
    if (response == ui.Button.CANCEL){
      SpreadsheetApp.getActiveSpreadsheet().toast("Requests Processing Cancelled", 'Status', 3);
      return;
    }
    activeRequests.forEach((item,index,arr) => {arr[index][RTP_actionIndex] = "Delete"})
  }
  //----------------
  
  
  //Making sure we have all contact IDs and, if not, searching in Qualtrics using email:  
  activeRequests = getContactIDsFromEmail_(activeRequests)

  executeRequests(activeRequests = activeRequests,surveyDict = getSurveyDict_())
}

//--------------------------------
function executeRequests(activeRequests,surveyDict){
  
  //Setting up variables needed for writing output:
  var finishedRequests = getData_("FinishedRequests",initialRow = RTP_firstDataRow) //pre-populating finished requests with old data - will append to this
  var firstCol = SpreadsheetApp.getActive().getRangeByName("RequestsToProcess").getColumn() //Getting first column to write in
  var indices = SpreadsheetApp.getActive().getRangeByName("RequestsToProcess").getValues() //Re-loading data in preparation for getting indices:
  indices = indices.map(function(value,index) {return value[RTP_indexIndex];}) //Isolating only index column values (for lookup)
  var sheet = SpreadsheetApp.getActive().getSheetByName("Requests") //Specifying sheet for writing

  //Setting up details of the API call to Qualtrics which will get contacts' survey history:
  var params = {"headers":directoryHeader,"method":"get"};
  var url = "https://zalandomafo.eu.qualtrics.com/API/v3/directories/POOL_1WXqEdxRzuerYhv/contacts/{CID}/history?type=response&pageSize=100"

  SpreadsheetApp.getActiveSpreadsheet().toast("Anonymizing / deleting data...\nThis may take a minute or two.", "Status", 30) //Notifying

  try{
    activeRequests.forEach((item,index,arr) => {
      //GETTING SURVEY DATA
      var surveyResponsesData = getPaginatedQualtricsData_(url.replace(/{CID}/g,item[RTP_contactIndex]),params) //Getting meta-data on which surveys the contact answered
      //Creating 2D array of survey IDs and response IDs from raw Qualtrics output (as precursor to making dictionary)
      surveyResponsesData.forEach((item,index,arr) => {arr[index] = [arr[index]['surveyId'],arr[index]['responseId']]})
      surveyResponsesData = surveyResponsesData.filter(item => item[1] != null) //filtering out items with null responseIDs
      surveyResponsesData = Object.fromEntries(surveyResponsesData) //Transform our list into key-value pairs
      
      //Deleting or anonymizing survey response data as requested:
      if(item[RTP_actionIndex] == "Delete"){ deleteSurveyData_(surveyResponsesData, surveyDict, whitelistedHttpCodes) }
      else{ anonymizeSurveyData_(surveyResponsesData, surveyDict, whitelistedHttpCodes) }
      
      //Deleting contact from Qualtrics Directory:
      deleteContactFromDirectory_(item[RTP_contactIndex],whitelistedHttpCodes)
      
      //prepending request to list of finished requests in preparation for writing. Order represents column order of finished requests.
      finishedRequests.unshift([item[RTP_contactIndex],item[RTP_actionIndex]+"d",today,item[RTP_reasonIndex]])
      
      //Deleting original request data:
      sheet.getRange(indices.indexOf(item[RTP_indexIndex])+1,firstCol,1,item.length).clearContent()
    })
  }
  catch(err){
    throw err
  }
  finally{
    const firstCol = SpreadsheetApp.getActive().getRangeByName("FinishedRequests").getColumn()
    sheet.getRange(RTP_firstDataRow,firstCol,finishedRequests.length,finishedRequests[0].length).setValues(finishedRequests)
    //Sorting requests range by requested date so that cleared rows are effectively removed.
    //Note: Incrementing requestedDateIndex because column-indexing starts at 1 instead of 0
    rangeSorter_("RequestsToProcess",RTP_firstDataRow,[{"column":RTP_requestedDateIndex+1,"ascending":true}])
  }
  SpreadsheetApp.getActiveSpreadsheet().toast("All requests processed", "Status", 3) //Notifying
}

//--------------------------------
//---Defining Helper Functions:---
//--------------------------------
function deleteContactFromDirectory_(contactId,whitelistedHttpCodes){
  //function which deletes a single contact from the Qualtrics XM directory
  var params = {"headers":directoryHeader,"method":qualtricsAction,"muteHttpExceptions":true}
  var url = "https://zalandomafo.eu.qualtrics.com/API/v3/directories/POOL_1WXqEdxRzuerYhv/contacts/" + contactId
  //Next, calling the API:
  response = JSON.parse((UrlFetchApp.fetch(url, params=params)));
  httpStatus = response['meta']['httpStatus']
  
  //Finally- throwing an error if the process failed for an UNACCEPTABLE reason (not in whitelistedHttpCodes)
  if(!whitelistedHttpCodes.includes(httpStatus)){
    //Checks whether we get an unacceptable response to the deletion query. If so, we throw an error with an explanation and halt the process
    throw "Directory Contact Deletion Failure: (" + httpStatus + ") " + response['meta']['error']['errorMessage']
  }
}

//--------------------------------
function deleteSurveyData_(surveyResponsesData, surveyDict,whitelistedHttpCodes){
  //function which deletes individual responses from surveys
  //NOTE: is 'request' necessary as an argument?
  //--------
  //Data Structures:
  //surveyResponseData = {surveyID:responseID, surveyID:responseID, surveyID:null}
  //surveyDict = {surveyID:API_Key, surveyID:API_Key}
  
  var params = {"method":qualtricsAction,"muteHttpExceptions":true}
  var response = {}
  var httpStatus = ""
  var alertButton
  
  for (survey of Object.keys(surveyResponsesData)){
    //First, specifying API Key & URL I need to use. Note that if the survey isn't found, a warning is given and the user is asked whether
    //they want to continue. It could be harmless (deleted survey) or problematic (the survey is not accessible via the given API keys)
    if(surveyDict[survey] == null){
      alertButton = ui.alert("Warning","Survey " + survey + ` not found. This is likely either because (1) the survey has been deleted or (2) access has not been given to this survey.\n
      Click 'OK' to skip this survey (if deleted). Click 'Cancel' to abort deletion (if you need to give access)`,ui.ButtonSet.OK_CANCEL)
      if (alertButton == ui.Button.CANCEL){
        throw "Requests Processing Cancelled"
      }
      else{ continue; }
    }
    params['headers'] = {"X-API-TOKEN":surveyDict[survey]}
    url = "https://zalandomafo.eu.qualtrics.com/API/v3/surveys/" + survey + "/responses/" + surveyResponsesData[survey]
    
    Logger.log(survey)
    //Next, calling the API:
    response = JSON.parse((UrlFetchApp.fetch(url, params=params)));
    httpStatus = response['meta']['httpStatus']
    //Finally- throwing an error if the process failed for an UNACCEPTABLE reason (not in whitelistedHttpCodes)
    if(!whitelistedHttpCodes.includes(httpStatus)){
      //Checks whether we get an unacceptable response to the deletion query. If so, we throw an error with an explanation and halt the process
      throw "Survey Response Deletion Failure: (" + httpStatus + ") " + response['meta']['error']['errorMessage'] + " [" + survey + " : " + surveyResponsesData[survey] + "]"
    }
  }
}

//--------------------------------
function anonymizeSurveyData_(surveyResponsesData, surveyDict){
  //NOTE: Anonymization is much more complicated to implement than deletion. Rather than asking Qualtrics to simply delete 1 response, we
  //will likely be required with anonymization to (1) read in the survey response, (2) identify which data points carry PII (most difficult part),
  //(3) change these data points to be blank (or to be "redacted"), (4) ask qualtrics to update the response with these values
  //At this point, my primary concern is getting this up and running and so, as a quick fix, I am asking all anonymization requests to instead be deleted.
  // - Kevin Nov. 12, 2020
  throw "Anonymization not yet implemented. Contact Kevin. :("
}

//--------------------------------
function rangeSorter_(rangeName, firstRow, sortObj){
  //This function sorts a named range starting with 'firstRow' - any headers above that row will not be sorted.
  //The 'sortObj' is a specification of how to sort: https://developers.google.com/apps-script/reference/spreadsheet/range#sortsortspecobj
  var targetRange = SpreadsheetApp.getActive().getRangeByName(rangeName).getA1Notation() //Getting range notation
  targetRange = targetRange.replace(/[0-9]{0,2}:/g,firstRow + ":") //inserting/replacing start row with specified 'firstRow'
  SpreadsheetApp.getActive().getRange(targetRange).sort(sortObj);
}

//--------------------------------
function getPaginatedQualtricsData_(url, params){
  //General function which calls a Qualtrics API which is supposed to return pages of results.
  //It stores the results of this data in a list and returns it.
  //This function continues calling the API until there are no more pages to iterate through, at which point
  //it returns the list of results.
  //Users can modify the parameters and the url to specify which API call to make and input any data, if needed.
  var returnList = []
  var httpStatus = "200 - OK"
  var data = {}
  var response = ""

  //Continue to call API until there are no more pages to get:
  while (httpStatus == "200 - OK" && url != null) {
    response = UrlFetchApp.fetch(url,params=params);
    data = JSON.parse(response)
    httpStatus = data['meta']['httpStatus']
    url = data['result']['nextPage'];
    returnList = returnList.concat(data['result']['elements']);
  }
  return returnList 
}

//--------------------------------
function getContactIDsFromEmail_(requestsArray){
  //This function takes in a 2D array of requests. If the requests do NOT have contact IDs, this script
  //uses email address to look for contact IDs in Qualtrics.
  //This script then returns the SAME 2D array, but with these contact IDs filled in.
  //This is important because contact IDs are used for many Qualtrics API calls.

  var searchUrl = "https://zalandomafo.eu.qualtrics.com/API/v3/directories/POOL_1WXqEdxRzuerYhv/contacts/search"
  var payload = {"filter":{"filterType":"email","comparison":"eq"}}
  var params = {"headers":directoryHeader,"method":"post","contentType":"application/json"}
  var response //Declaring variable to be used in following iteration
  requestsArray.forEach((num,index) => {
    //If there is no valid contact ID, then search for the contact in Qualtrics using the email address
    //& return the contact ID
    if(!requestsArray[index][RTP_contactIndex].match(/^CID_.*/g)){
      payload['filter']['value'] = requestsArray[index][RTP_emailIndex]
      params['payload'] = JSON.stringify(payload)
      response = JSON.parse(UrlFetchApp.fetch(searchUrl,params=params));
      if(response['result']['elements'].length > 0){
        return requestsArray[index][RTP_contactIndex] = response['result']['elements'][0]['id']
      }
      else{
        throw "Error: Email '" + requestsArray[index][RTP_emailIndex] + "' is not in Qualtrics Directory"
      }
    }
  })
  return requestsArray;
}

//--------------------------------
function getData_(rangeName,initialRow=1){
//This function gets data from the spreadsheet & cleans it up by removing rows with an empty first column.
//Also allows user to specify an offset (i.e. get rid of first 3 rows).
//-----
  var contacts = SpreadsheetApp.getActive().getRangeByName(rangeName).getValues()
  //firstDataRow represents the first row where actual data is held in the spreadsheet. Currently it's row 3.
  //Whatever it is, we subtract 1 since Javascript arrays start from 0, then we exclude the previous rows:
  contacts = contacts.slice(initialRow-1,)
  //Filtering out rows if the first element is empty:
  return contacts.filter(row => {return row.reduce(elem => {return elem != ""})})
}

//--------------------------------
function getSurveyDict_(){
  var api_keys = getQualtricsApiKey_Multiple_()
  api_keys = Object.values(api_keys) //Getting rid of JSON structure- making list of API keys
  //Returns a dictionary- where survey IDs are keys and API keys are values:
  
  //Specifying url & parameters needed for pulling in lists of surveys via Qualtrics API:
  var url = "https://zalandomafo.eu.qualtrics.com/API/v3/surveys"
  var params = {"headers":{"contentType":"application/json"},"method":"get"}
  var surveyDict = {}
  
  SpreadsheetApp.getActiveSpreadsheet().toast("Loading survey lists...", "Status", 5) //Notifying
  for (key of api_keys){
    params['headers']['X-API-TOKEN'] = key
    surveyList = getPaginatedQualtricsData_(url, params) //For each API key we have, first pull in a list of the surveys it has access to
    surveyList.forEach((item,index,arr) => {arr[index] = [item['id'],key]}) //Then, only keep the survey ID, next to the API key
    surveyList = Object.fromEntries(surveyList) //Transform our list into key-value pairs: surveyId = Api_key
    surveyDict = Object.assign(surveyDict,surveyList) // Combine these key-value pairs with previously-collected pairs
  }
  return surveyDict
}

//--------------------------------
function getQualtricsApiKey_Multiple_(){
  //This function is just to abstract the retrieval of the API key so it's not hard-coded in this script
  //If you are copying this script, this function will probably fail, but not to worry! You can simply return your
  //Qualtrics API key hard-coded here, or set up a similar retrieval system for your own API key.
  //This "Multiple" version expects a different JSON structure since the JSON contains API keys from
  //multiple User Research Accounts:
  //---
  //Getting API token as string "{'X-API-TOKEN':{'Kevin':'000000','Dan':'111111','Charlese':'222222'}}"
  var fileId = '1hy4EyU4N03JpJYO3f_Su_9kZ8YtNJT1R'
  try{ var keyTxtFile = DriveApp.getFileById(fileId).getBlob().getDataAsString() }
  //If this fails, it's likely because the user doesn't have access to this Drive file
  catch(err){ throw "Error: Unable to access Qualtrics API key(s) (Google Drive Id: " + fileId + ")" }
  
  //Converting string to JSON:
  keyTxtFile = JSON.parse(keyTxtFile)
  return(keyTxtFile['X-API-TOKEN'])
}

//--------------------------------
function getQualtricsApiKey_(){
  //This function is just to abstract the retrieval of the API key so it's not hard-coded in this script
  //If you are copying this script, this function will probably fail, but not to worry! You can simply return your
  //Qualtrics API key hard-coded here, or set up a similar retrieval system for your own API key.
  //---
  //Getting API token as string "{'X-API-TOKEN':'000000'}"
  var fileId = '1BM1vklN8mVyYSTXFbXkjkSZiyDAZ9Htt'
  try{ var keyTxtFile = DriveApp.getFileById(fileId).getBlob().getDataAsString() }
  //If this fails, it's likely because the user doesn't have access to this Drive file
  catch(err){ throw "Error: Unable to access Qualtrics API key(s) (Google Drive Id: " + fileId + ")" }

  //Converting string to JSON:
  keyTxtFile = JSON.parse(keyTxtFile)
  return(keyTxtFile['X-API-TOKEN'])
}
