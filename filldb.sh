
#
# if have to start over, populate the DB with something....
#

curl -v -H "Accept: application/json" -H "Content-type: application/json" -X POST -d '@a-puck.json' https://localhost:8080/puck
curl -v -H "Accept: application/json" -H "Content-type: application/json" -X POST -d '@b-puck.json' https://localhost:8080/puck


