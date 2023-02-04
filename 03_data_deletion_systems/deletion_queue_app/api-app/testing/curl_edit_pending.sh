#Make API request adding a new request to the system:
curl -X POST -H "Content-Type:application/json" -d '{"rejected":"TRUE"}' 127.0.0.1:5000/api/v1/requests/pending/3