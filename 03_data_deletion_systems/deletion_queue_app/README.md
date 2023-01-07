# deletion_queue_app
Author: Kevin Stine
Created: Dec. 7, 2022

---

## What is this?
This deletion_queue_app is a personal project to implement a solution to a real-world business problem that I have observed in my day job: on-demand data deletion of sensitive customer information.

### What exactly is the problem?
All companies in countries with data protection laws (particularly GDPR, as in this case) need to comply with the deletion of customer data in a potentially on-demand manner.<br>
A data deletion request could come in from a variety of systems. When it does, the request needs to be propogated to all relevant systems, and the consequences for failure can be high (legal action if data is not deleted within a specific time frame).<br>
This is a particularly difficult problem in my experience because it combines a huge breadth (ALL systems with customer data are affected) with a very low tolerance for error. However, the time frames required to process these requests are often generous in the scope of regular latency concerns - we often have weeks rather than seconds.<br>
This kind of system therefore can afford to be slow or asynchronous, although data-checking procedures need to be comprehensive.

### How should this be built?
I'll start by listing out the requirements and tolerances of what we need:
- Speed: **days to weeks**
- Fault tolerance: **very low**
- Input sources: **very broad, can change quickly**
- Output sources: **very broad, can change quickly**
<br>
We can also divide the application we need to build into 2 pieces:
- Receive requests
- Forward requests / delete data
<br>
This description is simplistic, but we can design different solutions for both pieces, so this is a useful distinction.

---

Notes:
Kafka? Or API-first?
Let's maybe start with Kafka assuming that the only job we have is to be the host of the data - and others will push data / consume it from us (simple)
Then lets build a different API-first system which would be a centralized system - allowing users to POST and see requests, but processing happens within the app - it has a list of systems to push changes to. This centralised processing means there is only 1 place to look for failure if something doesn't work.