# Deletion Queue App
Author: Kevin Stine
Created: Dec. 7, 2022

## Resources used in this project:
* [Alvin Lee's Medium article on setting up Kafka on K8s](https://levelup.gitconnected.com/how-to-deploy-apache-kafka-with-kubernetes-9bd5caf7694f)
* [Wojciech Pratkowiecki's simple Kafka setup based on Confluence](https://blog.datumo.io/setting-up-kafka-on-kubernetes-an-easy-way-26ae150b9ca8)

Also see the resources on Kubernetes, Flask and Minikube under trainings/kubernetes/custom_k8s_03

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
We can also divide the application we need to build into 3 pieces:
1. Receive requests from input systems (API ingress)
2. Store requests (persistent database)
3. Forward requests to output systems (scheduled procedure)
<br>

These 3 tasks will translate into three distinct parts of the application.

---

## Architecture

### API ingress
The 'API' part of the application will receive requests for deletion through one of its endpoints. The API will also modify existing records as needed (e.g., by using an endpoint to 'approve' or 'reject' existing requests) and list requests.

### Persistent database
The database part of the application will simply store the data - likely in a single table. If volume becomes high, indexing or sorting can be implemented (by request date?) to slice the dataset.
>Note: We will also need to indicate which requests are not yet dealt with + which requests are finished. This might be best achieved by creating an 'archive' table within this database where references to processed records are stored. Not clear yet how long these records would be stored.

### Forwarding procedure
This part of the application will be responsible for checking the existing requests and forwarding them for further processing based on some rules. The rules and the destinations requests are forwarded to will both be configurable.
>Note: In some special cases, the rules and destinations overlap (e.g., only certain types of requests get forwarded to certain destinations. Need to ensure this structure is very clear and easy to configure.

Requests will be stored in a neighboring Kafka instance within the same Kubernetes cluster.
> Idea: A future version could store requests via an external, low-cost database to make the application more fault-tolerant.

---

## Development Steps

### 1. Build API V1.0

#### a. Endpoint proof-of-concept
- [X] Define the endpoints needed and what data is required from client (use Swagger doc as planning area)
- [X] Define payload data structure for all endpoints
- [X] Implement in Flask
- [X] Test endpoints

#### b. Class setup
- [X] Define overall class structure(s) for the API
  - Basic could be a simple 'database_connection' class that connects to persistent database and has abstracted methods for storing / retrieving data from it
  - We could also implement a class for handling / checking incoming payloads from endpoints
  - We could also implement an error class for better errors generally
- [X] Implement class definition(s)
- [X] Connect class(es) to API endpoints and to a **local database (JSON?) for testing**
- [ ] Test endpoints
  - [ ] Test malformed payloads

#### c. Deploy
- [ ] Deploy API to production environment
- [ ] Re-test

---

### 2. Build persistent database

#### a. Database setup
- [ ] Create database in production environment
  - [ ] Decide whether to use Postgres as persistent K8s volume or an external database
    - Notes: It might be more nicely self-contained if I just used a persistent volume in K8s - an external database would require additional setup and wouldn't be as 'clean'. I also don't have experience with setting up persistent k8s volumes, so that would be nice practice.
- [X] Define database schema:
  - I think we only need 2 tables: [pending requests] and [finished requests].
    - pending requests:
      - UUID (string)
      - Date Added (date)
      - identifier (string)
      - input reason (string)
      - rejected (boolean)
        - Note: I don't think there is a need to show approval - all requests are approved by default - only explicit rejection is relevant.
    - finished requests:
      - < Same as pending >
      - Date processed (date)
- [ ] Test connections to database 

#### b. Connect API to database
- [ ] Edit API to use production database
- [ ] Test API
  - [ ] Test adding, modifying, and removing from database

#### c. Test persistence
- [ ] Restart API runtime - ensure data is still persisted
- [ ] Stress-test database (e.g., if implemented using distributed database, take some replicas offline and ensure no data was lost)

---

### 3. Build forwarding procedure

#### a. Define structure of rules + destinations
- [ ] List out probable rules for forwarding to different destinations
- [ ] List out probable destinations
- [ ] Decide how to separate rules from forwarding

#### b. Class setup
- [ ] Define overall class structure(s) for the API
  - Basic could be a simple 'database_connection' class that connects to persistent database and has abstracted methods for retrieving data (could be simple generator function to iteratively - or asynchronously? - process requests)
    - This class would also need to record confirmations of forwarding from all destinations and write these to database
  - A good extension would be an error-handling class which has custom protocols for re-trying data deletion (as well as error reporting)
- [ ] Implement class definition(s)
  - Idea: Make new destinations as new methods in class? Or maybe a single method that calls a user-provided function name?

#### c. Deploy
- [ ] Deploy forwarding procedure to production environment
- [ ] Set up connection to persistent database & test connection
  - Note: Can I re-use database-connection class from API?

#### d. Test resilience
- [ ] Test what happens when a single destination fails
- [ ] Test what happens when multiple - or all destinations fail
- [ ] Test that confirmations of forwarding are recorded correctly to database
- [ ] Test what happens when data is RE-FORWARDED (i.e., are duplicates handled correctly)

---

## Dev Notes:

> Feb. 5, 2023:
> Finished working on testing 'get_finished_by_date' method in our database connection class
> **Note:** Can no longer test database connection class as standalone script due to configparser using relative paths to load
> config file - use `start_app.sh` instead.
> Next step is to implement the marshmallow validation.py script so that I can check my incoming POST request bodies in app.py

---

> Feb. 7, 2023:
> Finished implementing validation for POST requests.
> Next steps are:
> 1. Doing more testing with malformed requests (try to break the system) - check out error codes returned
> 2. Get postgres working on K8s
> 3. Deploy api to K8s
> 4. Integrate api on k8s with database on k8s
