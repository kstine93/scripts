/*
---
Title: Function Library - GeneralFunctions.gs
Authors:
* Kevin Stine (unless otherwise specified in code below)
---------------------------------------
Purpose: This script is a function library focusing on functions necessary for interacting with Google Drive (including Sheets, Docs, etc.)
and pure Javascript functions (functions which do not interact with any Google Drive structures and, in most cases, do not use any functions
specific to Google Scripts).

Last Updated: Aug. 27. 2021
---
*/

//------------------------------
//--- Google Sheet Functions ---
//------------------------------

//--------------------------------
function getNamedRangeData_(rangeName,initialRow=1){
  //PURPOSE:
  //  This function imports data from a named range of a spreadsheet as an array.
  //  It then cleans out any empty elements from the array & returns it
  //ARGUMENTS:
  //  rangeName = name of the spreadsheet range
  //  initialRow = row of the spreadsheet where data begins (data before this index will be removed)
  //RETURNS:
  //  2D array of data
  //

  let data = SpreadsheetApp.getActive().getRangeByName(rangeName).getValues()

  //firstDataRow represents the first row where actual data is held in the spreadsheet. Currently it's row 3.
  //Whatever it is, we subtract 1 since Javascript arrays start from 0, then we exclude the previous rows:
  data = data.slice(initialRow-1,)

  //Filtering out rows if the row is completely empty:
  return data.filter(row => row.filter(elem => elem != "").length > 0)
}

//--------------------------------
function getOrCreateSheet_(sheetName){
  //PURPOSE:
  //  To find & return a sheet object if found in the current active spreadsheet.
  //  If none is found, a new sheet is created with the given name & returned.
  //ARGUMENTS:
  //  sheetName = name of the sheet in the active spreadsheet to be found or created
  //RETURNS:
  //  Sheet object
  //
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    //If the sheet doesn't already exist, make it!
    SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
    sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  }

  return sheet
}

function getDriveIdFromUrl(url) {
  //Taken from Stack Overflow: https://stackoverflow.com/questions/16840038/easiest-way-to-get-file-id-from-url-on-google-apps-script
   //PURPOSE:
  //  Convert a Google Drive URL into a Drive ID (embedded in URL). Most useful with 'GetfilebyID' function from Google
  //ARGUMENTS:
  //  URL of a Google Drive file
  //RETURNS:
  //  ID of a Google Drive file
  //
  return url.match(/[-\w]{25,}/);
}

//================================END================================


//---------------------------------
//--- Pure Javascript Functions ---
//---------------------------------

//--------------------------------
function getAllIndices_(arrData,element){
  //PURPOSE:
  //  Search through a 1D array and find all elements which match a user-given value
  //ARGUMENTS:
  //  arrData = 1D array to search through
  //  element = user-given value to search for
  //RETURNS:
  //  array of indices where a match was found
  //
  //Find ALL instances of an index in an array
  //Copied from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
  let returnList = []
  let index = arr.indexOf(element);

  while (index != -1){
    returnList.push(index)
    index = arr.indexOf(element, index + 1);
  }
  
  return returnList
}

//--------------------------------
function stringReplaceIn2DArray_(arrData,findRegex,input){
  //PURPOSE:
  //  This function searches iteratively through each element of a 2D array.
  //  replace is called on each element to replace any found regex matches with a user-given value
  //ARGUMENTS:
  //  arrData = 2D array to search through
  //  findRegex = Regular expression used to match & replace values in the array
  //  input = when a match is found, this input replaces the match in the array element
  //RETURNS:
  //  2D array of data
  //
  //Turning commas into full returns:
  return arrData.map(row => {
    return row.map(elem => {
      //return elem.replace(findRegex,input)
      return elem.replace(findRegex,input)
    })
  })
}

//--------------------------------
function overwriteColumnsIn2DArray_(arrData,columnIndices,input=""){
  //PURPOSE:
  //  This function replaces all nth elements in the nested (2nd level) arrays of a 2D array with
  //  a given user input. The primary use case for this is overwriting data in 2D arrays where each
  //  nested array is a 'row'. This function then effectively overwrites specific columns.
  //ARGUMENTS:
  //  arrData = 2D array to iterate over & overwrite data
  //  columnIndices = For each nested array, overwrite these indices
  //  input = when overwriting data, provide this as the replacement value
  //RETURNS:
  //  2D array of data
  //
  //Function to clean out columns from array data before the data are written to the spreadsheet.
  //This can be used to keep personal information (e.g. email) from being written.
  //This takes a list of columns which we want to erase e.g. ['email','RecipientEmail','pid]
  //This also takes a 2D array of the data we want to work with.

  //Overwriting column data:
  return arrData.map(row => {
    columnIndices.forEach(index => {row[index] = inputString})
    return row
  })
}

//--------------------------------
function writeToNamedRange_(rangeName,initialRow=1,data){
  //PURPOSE:
  //  This function writes data back to a named range. In the process,
  //  it clears existing data from the named range.
  //ARGUMENTS:
  //  rangeName = name of the spreadsheet range
  //  initialRow = row of the spreadsheet where data begins (it can be convenient to list
  //    a named range as cols (e.g., "A:D") for flexibility of length. This specifies starting row.)
  //  data = data to write
  //RETURNS:
  //  NA
  //

  //Getting range:
  const range = SpreadsheetApp.getActive().getRangeByName(rangeName)

  //Setting default value for headers (empty - no headers):
  let headers = [[]]

  //Getting any headers - if initial Row > 1
  if(initialRow > 1){
    headers = range.getValues().slice(0,initialRow-1)
  }
  
  //Appending headers:
  data = [...headers,...data]

  //Clearing existing data:
  range.clearContent()

  //Writing
  const sheet = range.getSheet()
  sheet.getRange(1,range.getColumn(),data.length,data[0].length).setValues(data)
}

//--------------------------------
function objectFrom2dArray_(array,keyColIndex = 0,headers=null){
  //PURPOSE:
  //  This function takes a 2D array and creates an object from it. For each row of the array,
  //  the first row value is made key by default. For subsequent values, the header for that column
  //  is used as the key in the key:value pairings nested within the first key
  //
  //  | name | age | color |              {
  //  ----------------------     ----->     "Dave": {"age":23, "color":"blue"}
  //  | Dave | 23  | blue  |                "Mary": {"age":47, "color":"green"}
  //  | Mary | 47  | green |              }
  //
  //ARGUMENTS:
  //  array = 2D array to be transformed
  //  keyColIndex = index of column which should be used as first key
  //  headers = Ordered headers for table. if null, first row of data will be used.
  //RETURNS:
  //  Object
  //

  if(headers == null){
    headers = array.splice(0,1)
  }

  let result = {}

  for(row of array){
    nested_json = {}
    for(i=0;i<row.length;i++){
      if(i == keyColIndex){
        continue; //Not also putting first key as nested object
      }
      nested_json[headers[i]] = row[i]
    }
    result[row[keyColIndex]] = nested_json
  }

  return result;
}

