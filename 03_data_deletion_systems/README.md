# Data Deletion Systems

---

## What is this?
This repo holds a few separate projects which are united by the fact that they all deal with the deletion of data on demand.
Each individual file gives more information on the environment they are run in and what they do, but you can find a short overview below.

---

## Overview of individual projects

#### Webhook_unscubscription_receiver.js
This small (and somewhat hacky) piece of code was required to be able to integrate with a 3rd party that was reporting when our customers wanted to delete their data (as is their GDPR right). This 3rd party was only able to send these messages via webhook. To receive these webhooks, I set up this simple Google Apps script and published it to the web (using a random UUID as basic authentication). Webhooks would then come in with customer IDs and these data would be stored within an accompanying Google Sheet to await further processing.

#### panel_data_deleter.js
This was a large project that was originally built in Google Apps Script, but which became quite large as it included additional services around data deletion. It's primary purpose was to take user-entered customer IDs and delete customer data from Qualtrics if it matched these IDs. This additionally required iterating through survey data to identify and delete individual survey responses (we have since required that all survey data is anonymized by default).

#### data_request_processory.ipynb
This Python notebook is the foundation for an automated script, but must still be run manually on a regular basis due to the lack of some API connections (i.e., our 3rd party provider doesn't have an API that can receive deletion requests). This code is run in a specific company environment which has pre-approved access to Presto for querying data. This code also integrates with Nakadi - a Kafka-like event broker - for sending confirmations of data deletion back to the company for auditing purposes.
