#Make API request adding a new request to the system:
curl -X POST -H "Content-Type: application/json" 127.0.0.1:5000/api/v1/requests/finished \
-d '{"startDate":"2022-01-01","endDate":"2023-12-30"}'