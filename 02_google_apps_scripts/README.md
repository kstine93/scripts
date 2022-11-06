# Google Apps Scripts Projects

---

## Usefulness of Google Apps Scripts
I have used Google Apps Scripts frequently in my work. Similar to Javascript in many ways, this language is great because it is (relatively) accessible to non-programmers who use Google Sheets (the IDE is accessible from the menu), and offers some native integrations with the Google Sheet, allowing you to build some easy user interfaces such as:

1. Buttons on the Google Sheet that your users can click to run your code.
2. Pop-ups on the Google Sheet to interact with your users during runtime (e.g., "We found 10 instances of data in need of deletion. Continue?").
3. Ability to read-and-write data directly to and from the Google sheet - taking user-entered data and processing it, for example.

Google Apps Script also offers 'triggers' to run your code based on time or user activity (e.g., reloading the Google Sheet), so it's relatively simple to create tools for non-programmers to use that don't require much maintenance. For these reasons, I have used it extensively. This GH repo shows a few of the bigger (or more successful) projects I created.

---

## Overview of individual projects

#### Mail Merges
Mail merge systems take a user-entered set of tabular data and send emails on behalf of the user, with the data being used to modify each message individually.
The tool I built allows users to enter email addresses and some custom variables (e.g., first name) into a Google Sheet, then run the code to send pre-set HTML email messages to the specified addresses.
The code also had some language filtering (i.e., sending emails marked as "DE" the German version of the message).

#### Email Reminders
One of the more simple and more successful tools that I built was a system to remind team members of recurring, but infrequent responsibilities.
For example, reminding users that it's time to upload invoices to a central repository.
The 'Office hours' code I have uploaded additionally takes this a bit further by reading and modifying Google calendar events - it takes calendar events which are flagged as "booked office hours" and it edits them so that the appropriate team members are invited (based on who is responsible for office hours in a particular week). Then it sends templated HTML emails to these same team members to notify them and give them an overview of how many booked sessions are upcoming.

#### Function libraries
In the course of making tools in Google Apps Script, I have found it easier (and more maintainable) to write a set of pure functions that I can paste into new tools as needed. These are collected here and include code specific to the Qualtrics API (which my team used a lot), pure Google Scripts functions, and pure Javascript functions.
