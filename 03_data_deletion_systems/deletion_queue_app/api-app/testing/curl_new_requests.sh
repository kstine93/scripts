#Make API request adding a new request to the system:
curl -X POST -H "Content-Type: application/json" 127.0.0.1:5000/api/v1/requests/new \
-d '[{"email":"test@email.de","cause":"direct_request"}]'