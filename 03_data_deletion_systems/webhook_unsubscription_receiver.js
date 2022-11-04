/*
=== QuestionPro Unsubscription Webhook.gs ===

PURPOSE: This script's purpose is to receive http POST requests (a webhook request) from our team's QuestionPro account and then log
the information in that request to the 'QuestionPro OptOuts' tab of the 'data deleter' spreadsheet:
https://docs.google.com/spreadsheets/d/1ZSQ_o2KurGlV1TzJj2FL9Z_7P90onV23xb4B5yuYxRc/edit#gid=0

More specifically, we have configured this webhook in QuestionPro to message this script whenever someone unsubscribes from our panel there.
This script (which has been deployed as a web app accessible by anyone) receives the request and then prints it to the spreadsheet.

AUTHOR(S): Kevin Stine
LAST UPDATED: Sep. 28, 2021


Configuration Details:
======================

QUESTIONPRO:
------------
If you want to edit what data is sent to this script- or how it is triggered, you will need to edit the webhook in QuestionPro
(Under "Communities" --> "Modules" --> "Webhooks")
The current setup looks like this (note quotation marks):
- - - - - - - - - - -
REQUEST HEADER:
content-type:application/json

JSON REQUEST:
{"memberEmail":"{EMAIL_ADDRESS}","memberId":"{COMMUNITY_MEMBER_ID}"}
- - - - - - - - - - -

THIS SCRIPT:
------------
If you want to change how this script handles the data, you will not only need to change the code here, but you will need to
RE-DEPLOY this script as a web app. First change the code, and then click the 'Deploy' button at the top of the page. Then click
'New Deployment'. Name the deployment whatever you want (e.g. "QuestionPro Unsubscriptions - V3.0") and make sure it's accessible to ANYONE.
It will deploy after you confirm - then copy and paste the new Web App URL to the QuestionPro webhook.
*/

function doPost(e){
  //Read in data sent with HTTP POST Request:
  let parsedData = JSON.parse(e.postData.contents)

  //Currently, just printing these data to a certain sheet:
  SpreadsheetApp.getActive().getSheetByName("QuestionPro OptOuts").appendRow([new Date,"post",parsedData.memberEmail])
  return HtmlService.createHtmlOutput("post request received")
}
