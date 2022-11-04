/*
Title: OfficeHoursReminders.gs
Author: Kevin Stine
Last Updated: January 18, 2022
---
What it does: Sends a reminder email (from a template)
to the team members who are responsible for the upcoming week of VoC Office Hours.

Why it was made: There is no automatic system by which office hour bookings notify the team. Up until now, the team in charge of office hours must look in the calendar manually to see which office hours are booked. Still - new bookings can be made last-minute and with no prior warning.
This system does 2 things: On a specific day (currently: Monday) it sends a summary of the office hours booked for the upcoming week. Additionally, on every OTHER day of the week (Tuesday - Friday), it checks to see if any NEW office hours have been booked. If yes, then it sends an additional message to the team.

Note that this script is only one piece of this system. Part of this system is also the 'schedule' for which team is responsible for which
weeks of office hours, which you can find here:
https://docs.google.com/spreadsheets/d/1n-9ni40u-WBuxpp82AL9MGKUj9HeOBQLIoeZ8JtGnbA/edit#gid=926512032

This script has a trigger for it to run every day. The code below checks what day it is and executes different actions depending on that.
*/

//This array of JSON objects represents each of the office hours that we EXPECT in a given week.
//This can be easily changed if our office hours cadence changes.
//Note: 'weekday' is 0=Sunday,1=Monday,2=Tuesday, etc.
//Note: please keep these in chronological order so they are displayed in this way in the emails.
const officeHoursSessions = [
  {"weekday":"1","startTime":"14:00","endTime":"15:00"},
  {"weekday":"2","startTime":"14:00","endTime":"15:00"},
  {"weekday":"3","startTime":"14:00","endTime":"15:00"},
  {"weekday":"5","startTime":"14:00","endTime":"15:00"}
]

/*
To Do:
1. Figure out way to programmatically create unordered list for Monday email (use JSON array to construct event description, process
  event object to get whether there are attendees or not)
2. Apply this same logic to Ad Hoc warning email (i.e., the email should specify when the newly-booked event is).
3. Test again.
*/ 

//-------------------------
//----PRIMARY FUNCTIONS----
//-------------------------
function sendOfficeHoursReminders(){
  // To be run every day M - F

  //1. Pulling start and end date of week from sheet:
  const data = SpreadsheetApp.getActive().getRangeByName("ThisWeekOfficeHours").getValues()[0]
  //const weekNum = data[0] //unused data
  const startDate = data[1]
  const endDate = data[3]
  const team = data[4]
  //const memberNames = data[5].split(", ") //unused data
  const memberEmails = data[6].split(", ")

  Logger.log("Team Emails: " + [...memberEmails])

  //2. Getting calendar data:
  const cal = CalendarApp.getCalendarById('c_f0t3fdrsh17e99088uhhugbotc@group.calendar.google.com')

  //Getting today's date
  const today = new Date()

  //On mondays I am sending digests to the responsible team - one overview of the office hours for that week.
  if(today.getDay() == 1){
    sendOfficeHoursDigest_(cal,startDate,endDate,team,memberEmails)
  }
  //If it's Tuesday - Friday, this script will instead check for last-minute bookings that weren't raised on Monday:
  else if(today.getDay() >= 2 && today.getDay() <= 5){
    sendAdHocReminders_(cal,startDate,endDate,team,memberEmails)
  }
}

//-------------------------
function sendOfficeHoursDigest_(cal,startDate,endDate,team,memberEmails){
  //Sends email message which informs members of an office hour team which office hours events have been booked.
  //Designed to be sent only once per week- captures all events within given start and end date.

  //Getting this week's events from the calendar
  let thisWeeksEvents = cal.getEvents(startDate,endDate)
  thisWeeksEvents = filterOutDeclinedEvents_(thisWeeksEvents)

  //3. Loading in Template and inputting basic details:
  let templateCode = HtmlService.createTemplateFromFile("OfficeHours_DigestEmail").getCode()

  //4. Dynamically adding data to template:

  //Adding basic info:
  templateCode = templateCode.replace("{team}",team)
  templateCode = templateCode.replace("{eventCount}",thisWeeksEvents.length.toString())
  templateCode = templateCode.replace("{startDate}",startDate.toLocaleString("en",{weekday: "long", month:"long",day:"numeric"}))
  // Decrementing enddate by 12 hours (half of a day) so it shows up as Friday instead of Saturday
  endDate.setUTCDate(endDate.getUTCDate() - 0.5) 
  templateCode = templateCode.replace("{endDate}",endDate.toLocaleString("en",{weekday: "long", month:"long",day:"numeric"}))

  //For each office hours session, we are going to construct HTML which shows (a) the time and date of the session and (b) if that
  //session is booked, how many people are booked for it. This is accomplished in the 'map' function below.

  let eventDetails = officeHoursSessions.map(session => {
    //Constructing event description:
    let description = "<li>"
    description += getWeekday_(session.weekday) + ", " + session.startTime + " - " + session.endTime + ": "
    description += "<b>"
    description += createOfficeHoursDescription_(getEventsFromList_(thisWeeksEvents,session.weekday,session.startTime)[0])
    description += "</b>"
    description += "</li>"
    return description
  })

  //Wrapping events in 'unordered list' HTML tags:
  eventDetails = "<ul>" + eventDetails.join('') + "</ul>"

  //Adding HTML string to template code:
  templateCode = templateCode.replace("{officeHoursList}",eventDetails)

  //4. Sending Message
  GmailApp.sendEmail(
    recipient= memberEmails,   // Recipient
    subject="Reminder: VoC Office Hours this week",  // Subject
    body="",  // Body is empty - all content in HTML body below
    {htmlBody: eval(templateCode).getContent(),
    bcc:'kevin.stine+receipt@zalando.de'} //*HTML body
  );

  //5. Adding team members as guests to each office hours event
  addGueststoEvents_(memberEmails,thisWeeksEvents)
}

//-------------------------
function sendAdHocReminders_(cal,endDate,team,memberEmails){
  //Function to check if additional events have been booked since the digest message went out earlier in the week.

  //Getting events for the rest of the week:
  let eventsForRestOfWeek = cal.getEvents(new Date(),endDate)
  eventsForRestOfWeek = filterOutDeclinedEvents_(eventsForRestOfWeek)

  //If an event hasn't been flagged to the team yet (i.e., at least one member of the team has not been invited)
  //then it's flagged as a newly-booked event:
  const newEvents = eventsForRestOfWeek.filter(event => { 
    //filtering for only those events where a member of the team (memberEmails) is !!NOT!! a guest
    let guestEmails = event.getGuestList().map(guest => guest.getEmail())
    return !guestEmails.filter(guest => memberEmails.includes(guest)).length >= 1
  })

  if(newEvents.length >= 1){
    //Only continuing if we have at least 1 new event - otherwise this code will terminate.

    //Filling out template:
    let templateCode = HtmlService.createTemplateFromFile("OfficeHours_AdHocWarningEmail").getCode()
    templateCode = templateCode.replace("{team}",team)

    let eventDetails = newEvents.map(event => {
      //Constructing event description:
      let description = "<li>"
      description += getWeekday_(event.getStartTime().getDay()) + ", "
      description += formatTime_(event.getStartTime()) + " - "
      description += formatTime_(event.getEndTime()) + ": "
      description += "<b>"
      description += createOfficeHoursDescription_(event)
      description += "</b>"
      description += "</li>"
      return description
    })

    //Wrapping events in 'unordered list' HTML tags:
    eventDetails = "<ul>" + eventDetails.join('') + "</ul>"

    templateCode = templateCode.replace("{newBookings}",eventDetails)

    //Sending reminder:
      GmailApp.sendEmail(
      recipient= memberEmails,   // Recipient
      subject="Notice: Last-minute Office Hours booked",  // Subject
      body="",  // Body is empty - all content in HTML body below
      {htmlBody: eval(templateCode).getContent(),
      bcc:'kevin.stine+receipt@zalando.de'} //*HTML body
    );

    //Adding team as guests to the event:
    addGueststoEvents_(memberEmails,newEvents)
  }
}


//-------------------------
//----SUPPORT FUNCTIONS----
//-------------------------
function addGueststoEvents_(guestsToAdd,eventList){
  //Adds every email address from 'guestsToAdd' to as guests to events in eventList
  eventList.forEach(event => {
    guestsToAdd.forEach(guest => {
      /**
       * Note: Adding extra logic here to not invite team members to office hours if they have already been invited. This basically only runs during the 'digest' part of this code (scheduled for
       * Mondays) since the Ad Hoc version automatically does not process any events which already have at least 1 team member attending.
       * This was added so as to not re-invite team members to events which they may have already accepted the invitation for, since this either means that they have to re-accept the invitation, or
       * , for events where a team member is actually the primary booker of the event (like when we want to remove an office hours slot from the calendar for a particular week), re-inviting team
       * members will reset the acceptance of the event and can effectively re-open the event for booking. :( This happened on May 24, 2022. - Kevin (May 24th, 2022)
       */
      let guestList = event.getGuestList().map(entry => {return entry.getEmail()})
      console.log(guestList)
      if(!guestList.includes(guest)){
        console.log("Added:" + guest)
        event.addGuest(guest)
      }
    })
  })
}

function getWeekday_(dayAsNumber){
  const weekdays = {
    0:"Sunday",
    1:"Monday",
    2:"Tuesday",
    3:"Wednesday",
    4:"Thursday",
    5:"Friday",
    6:"Saturday"
  }
  return weekdays[dayAsNumber]
}

function formatTime_(time){
  //Wrapper for specific time formatting I want:
  return time.toLocaleTimeString("en",{ hour: '2-digit', minute: '2-digit', hour12: false,timezone:"CET"})
}

//-------------------------
function filterOutDeclinedEvents_(eventList){
  //Filtering this week's events to be only those which have ATTENDING guests (when people cancel office hours, their attendances
  //say 'no', but that extra booking still exists in the calendar)
  eventList = eventList.filter(event => {
    return !(event.getGuestList().map(guest => guest.getStatus()).every(status => status == "no"))
  })
  return eventList
}

//-------------------------
function getEventsFromList_(eventList,weekday,startTime){
  // This function takes a list of events and returns a list of events
  // filtered by the given start time and weekday. For example, if you supply '1'
  // for weekday and '10:00' for startTime, you will receive back a filtered list of events
  // which are on Monday and start at 10am within the list of events you supply.

  // Note: eventList should be list of events which will be searched through
  // Note: for weekday, Monday == 1, Tuesday == 2, etc.
  // Note: startTime should be formatted as "14:00", "08:30", "19:15", etc.)

  // Formatting user-provided time:
  startTime = startTime.split(":")
  const startHour = parseInt(startTime.splice(0,1)[0])
  const startMinute = parseInt(startTime[0])

  // Filtering for date:
  let events = eventList.filter(event => event.getStartTime().getDay() == weekday)

  // Filtering for time:
  events = events.filter(event => {
      let time = event.getStartTime()
      return time.getHours() == startHour && time.getMinutes() == startMinute
    })
  
  return events
}

//-------------------------
function createOfficeHoursDescription_(event){
  //Creates text to be put into the email template - for each event, this code looks to see if there are guests.
  //If yes, it returns text which tells how many guests there are. If not, it returns "NOT BOOKED".
  if(event){
    return event.getGuestList().length.toString() + " attendee(s)"
  }
  else { return "NOT BOOKED"}
}
