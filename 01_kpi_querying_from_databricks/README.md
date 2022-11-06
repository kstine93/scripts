# KPI Querying from Databricks

---

### Goal of project
The purpose of this project was to query KPIs in a way that collected data regularly and without human intervention.

### Explanation of files
The code is structured in a tree pattern - the 'write_kpis' file is one (admittedly long) script to query all KPIs, combine the results into a single object,
and write that object to a durable data storage system (AWS S3).<br />
However, this single high-level file doesn't hold much of the code for getting the KPIs - that is rather stored in the nested supporting scripts directory.
These supporting scripts each hold individual functions which query a specific KPI based (usually) on some configurable input. For example, the functions querying
Oracle KPIs are passed an object with Oracle connection details - which can be configured from the 'write_kpis' script.

### Environment to run this code in
This code was set up to run within Databricks - which has 3 important features which will need to be taken into account if this code is run in a different environment
**1. Integrated connections with AWS** - Databricks in this case had pre-built connections to AWS buckets, allowing pretty seamless querying of the data therein.
**2. Databricks secrets** - this code uses Databricks' built-in secrets management system. If you run this code outside Databricks, you'll need a different solution.
**3. Spark** - The Databricks account this was run on uses Spark by default (so there are no "import spark" commands, no need to set up a Spark session). This will need to be done manually outside of Databricks.

---

### Backstory + explanation of this project
I started working on this project because querying KPIs is one of those tasks which is easy to forget, mind-numbing to do, and quite annoying if you forget to do it. There was some previous code to accomplish this goal before I started - but it wasn't doing the job very well. The code was in short scripts written in different languages (primarily SQL and Python), intended to be run in different environments (Presto, Oracle, regular HTTP requests), and wasn't running automatically.
In short, the process for getting these data was:

1. Gather the code you need from 2-3 different locations
2. One-by-one head to the different environments, copy-and-paste the code you needed and run it
3. As the code finished, _copy-and-paste the results_ into a Google Sheet under today's date.

It must have been tedious - and prone to at least copy-and-paste errors. Additionally, since this code had been written by different engineers, there were slightly different expectations (and levels of accuracy) in what was being calculated. See below for a technical example.<br />

---

>**Example: Measuring average startup time of Databricks clusters**<br />
>One of the KPIs being queried was to calculate the average startup time of the Databricks clusters used by the company.<br />
>To calculate this, the **original** code followed these steps:
>1. Query Databricks API to get names of clusters
>2. For each cluster, get the events that happened in that cluster between user-given datetimes
>    1. Within the list of events for each cluster, identify the sequence which showed a cluster has started up ("STARTED" event followed by "RUNNING" event)
>    2. Get difference in timestamp between these events (showing startup time). Return this as the startup time for this cluster.
>5. Once you do this for all clusters, get the average of the reported startup times.
><br />
>However, this code had a big problem that hadn't been caught yet: namely, **clusters can start up multiple times**. In fact, more than half of our clusters stopped and re-started **over 10 times per day**. So by only checking one instance of the startup sequence ("STARTED" event followed by "RUNNING" event), we were only getting the **first** startup event within the specified time period.<br/><br />
>It was pretty simple to adapt this original code to ensure that it took into account all startup events, but it showed me also how different understandings of what to measure can produce inconsistent results.

---

I started to re-write this code in Databricks - which I chose with another engineer as the best environment since it already had connections to our S3 Data Lake and supported automated as well as manual execution of code (i.e., we could re-query specific KPIs at any time if we wanted to).
To help keep this code maintainable, I followed a few principles when doing this rewriting:

#### It is clear which KPIs are being queried
When starting this project, I had to do a lot of work to just understand what the KPIs were and where they were coming from. To make that process easier for the next person, I wrote a spreadsheet with an explanation of the KPIs and the code itself breaks down the KPIs according to where they are being queried.

#### It is simple to add or remove KPIs in the future
The code is modular - each KPI is returned by a single function (with 1 exception to save time and cost) and the "write_kpis" script has a very simple design that makes it (hopefully) clear how and where to add new KPIs or where to comment out the code from old KPIs.<br />
Additionally, the format of the resulting table is **long** - with the columns **Variable (KPI name), Value (KPI value),** and **Date**. If a KPI is removed or added, there is no need to edit any existing data in the table or the table's format.

#### The KPIs can be calculated over custom timespans
This is one of the changes I was most proud of. Instead of storing only end-result KPIs (e.g., the average startup time of our Databricks clusters for a specific day), the code instead stores the numbers which allow users to calculate this KPI themselves.<br />
Why? Because if I give you the average startup time on a given day, but you want the average startup time **for the entire week**, then **there is no way to calculate that**. Someone could try to estimate this by doing a 7-day average of the _individual day averages_, but this is incorrect math - if one day is highly skewed with longer startup times for everyone, this would mis-represent the KPI.<br />
Instead, the code for this KPI gives 2 values for each day: the **total startup time of all clusters** and the **number of clusters which started up**. You can add up these values across any time range you want, and _then_ divide them to get the average over this time span.
In this way, the KPI data being stored will never need to be re-queried just to analyze a custom time range.

---

### Improvements to be made
While I like the code base that I've written, I have also seen room for improvement. Below is a list of things I would do given the time to improve this code further.

#### Separate code into multiple executions
The code base separates KPIs into different files, but every function within these files is being called at some point during runtime. This presents a huge likelihood for failure. Since almost all of the KPIs are querying outside data and transforming it, there is a high probability that one of those KPI calls will fail, resulting in the entire script stopping and reporting an error.<br />
However, there is no need to query all the KPIs during the same runtime. Since the durable data store with the KPI results is in a long format, we can write KPIs asynchronously without issue.<br />
A better solution implementing this would specify user-defined data in a local config file rather than at the start of the script. Then, the "write_kpis" script would be broken into multiple different scripts (probably one each for Oracle, Github, and Databricks KPIs). These would be run at different times on the same day so that if any of these were to fail, the other KPIs would still be written without issue.

---

## Summary
This is a very short overview of what I did on this project, but it was complex and arguably needs to be shown in a format better than a README.
If you have questions, please email me (see my GH account)- happy to talk more about it :)<br/>
-Kevin
