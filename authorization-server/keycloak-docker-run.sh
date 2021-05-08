docker run --name kc -d -p 8080:8080 -p 8443:8443 \
  -e KEYCLOAK_USER=admin -e KEYCLOAK_PASSWORD=secret \
  -e KEYCLOAK_IMPORT=/tmp/demo_realm.json \
  -v $(pwd)/demo_realm.json:/tmp/demo_realm.json \
  -v $(pwd)/certs/tls.crt:/etc/x509/https/tls.crt \
  -v $(pwd)/certs/tls.key:/etc/x509/https/tls.key \
  jboss/keycloak