
#
# if have to start over, populate the DB with something....
#

curl -v -H "Accept: application/json" -H "Content-type: application/json" -X POST -d '@a-d3ck.json' https://localhost:8080/d3ck
curl -v -H "Accept: application/json" -H "Content-type: application/json" -X POST -d '@b-d3ck.json' https://localhost:8080/d3ck


