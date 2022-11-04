/*
Title: MailMerge.gs
Author: Kevin Stine
Purpose: This code is written to interact with this spreadsheet: https://docs.google.com/spreadsheets/d/1o8gx3D95wFKSwVCgbvhCCQb1s8AvKH9361obnydPCRs/edit#gid=1071554731. This spreadsheet was used for the Body Measurement data collection study in Q1, 2022.

It reads in a list of email addresses and some meta data (e.g., country) from this spreadsheet, then sends an email using a draft template and an alias from the user's gmail account.

This code is best used as a starting point to develop other mail merge systems, since currently it is not very flexible.

*/

// Setting global variables

  //Setting Indices & meta-data of the "NewRequests" and "FinishedRequests" named ranges
  const nr_emailIndex = 0
  const nr_firstNameIndex = 1
  const nr_countryIndex = 2
  const nr_dateCompletedIndex = 3
  const nr_alreadySentIndex = 4
  const nr_firstDataRow = 3

  const fin_emailIndex = 0
  const fin_voucher = 1
  const fin_dateIndex = 2
  const fin_firstDataRow = 3

  //Setting indices of voucher codes data range:
  const vouch_countryIndex = 0
  const vouch_codeIndex = 1
  const vouch_firstDataRow = 2


  //Objects for each use case. These include an email template (pulled from user's Gmail drafts) and some text:
  const spanishMember = {
    "emailTemplate" : retrieveEmailTemplate_("***bodyMeasurement_SpanishMember***"),
    "emailSubject" : "Aquí está el código de tu tarjeta regalo de Zalando",
    "voucherValue" : "20 €"
  }

    const italianMember = {
    "emailTemplate" : retrieveEmailTemplate_("***bodyMeasurement_ItalianMember***"),
    "emailSubject" : "Ecco il codice del tuo Buono regalo Zalando",
    "voucherValue" : "20 €"
  }

  //Desired alias with which to send emails
  const aliasName = "voices@zalando.com"

  //Today's date
  const today = new Date()

/*
//--------------------------------
function onOpen() {
  //onOpen function to create new menu items. onOpen is a reserved function name which operates
  //as a simple trigger (executing on open)
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var newFuncs = [
  {name: "Send Voucher Emails", functionName: "main"}];
  ss.addMenu("Extra", newFuncs);
}
*/

//--------------------------------
function main() {

  //Getting aliases
  const aliases = GmailApp.getAliases();
  if (!aliases.includes(aliasName)){ throw "Gmail alias " + aliasName + " not available."}

  //Getting completed requests (for appending):
  let finishedRequests = getNamedRangeData_("FinishedRequests",fin_firstDataRow)

  //Getting new requests
  let newRequests = getNamedRangeData_("NewRequests",nr_firstDataRow)
  //Filtering out already-sent emails
  newRequests = newRequests.filter(request => {return request[nr_alreadySentIndex] == "No"})
  
  //Getting voucher codes - and dividing by country
  let vouchers = getNamedRangeData_("VoucherCodes",2)
  let spainVouchers = vouchers.filter(code => code[vouch_countryIndex] == "Spain")
  let italyVouchers = vouchers.filter(code => code[vouch_countryIndex] == "Italy")

  //Asking user to confirm before continuing with script:
  const ui = SpreadsheetApp.getUi()
  let message = "Continue sending {num} voucher email(s)?"
  response = ui.alert("Please confirm",message.replace(/{num}/g,newRequests.length), ui.ButtonSet.YES_NO);
  if (response == ui.Button.NO){
    throw "Process cancelled"
  }

  //Notifying
  SpreadsheetApp.getActiveSpreadsheet().toast("Processing " + newRequests.length + " requests.", "Status", 5)

  //Iterating through new requests. For each one, popping off the appropriate voucher and sending data
  //on to be sent via email.
  let voucherCode = null //Initializing variable to be used in iteration

  try{
    newRequests.forEach(request => {
      switch(request[nr_countryIndex]){

        case 'Spain' : 
        voucherCode = spainVouchers.pop()[vouch_codeIndex] //popping SPAIN voucher - returning only voucher code
        sendEmail_(request,spanishMember,voucherCode)
        break;

        case 'Italy' :
        voucherCode = italyVouchers.pop()[vouch_codeIndex] //popping ITALY voucher - returning only voucher code
        sendEmail_(request,italianMember,voucherCode)
        break;

        default : throw "Incorrect country - needs 'Spain' or 'Italy': " + request[nr_countryIndex]
      }

      //Logging:
      finishedRequests.push([request[nr_emailIndex],voucherCode,today])
    })
  }

  catch(err){ throw err }

  finally{
    //Writing vouchers:
    vouchers = [...spainVouchers,...italyVouchers]
    writeToNamedRange_("voucherCodes",vouch_firstDataRow,vouchers)

    //Writing finished requests:
    writeToNamedRange_("FinishedRequests",fin_firstDataRow,finishedRequests)
  }

}

//--------------------------------
function sendEmail_(request,memberType,voucherCode){
  let emailTemplate = memberType['emailTemplate']
  let emailBody = emailTemplate.html

  emailBody = emailBody.replace(/{CLAIM_CODE}/g,voucherCode)
  emailBody = emailBody.replace(/{FIRST_NAME}/g,request[nr_firstNameIndex])
  emailBody = emailBody.replace(/{VOUCHER_VALUE}/g,memberType['voucherValue'])

  GmailApp.sendEmail(
    recipient= request[nr_emailIndex],   // Recipient
    subject= memberType['emailSubject'],  // Subject
    body=emailTemplate.text,   // Body
    {htmlBody: emailBody,
    from: aliasName}
  );
}

//--------------------------------
function retrieveEmailTemplate_(subject_line){
  try {
    //*Searching your gmail account for messages with the specified subject line
    var messageObj = GmailApp.search('in:draft subject:'+subject_line)[0];
    //*Getting the message object from this message object.
    var message = messageObj.getMessages()[0];
    return {text: message.getPlainBody(), html:message.getBody()};
  } catch(e) {
    throw new Error("Email draft with subject: '" + subject_line + "' not found");
  }
}

