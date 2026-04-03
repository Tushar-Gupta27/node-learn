# Mounts
- mountPath is the path inside the container, where we want the file to end up
- also the | (pipe) operator is used to add a block of text data as file
- can add additional attributes - like if we are adding a client certificate and we want it to be `readOnly`
  - `readOnly: true `
- Inside teh configMap & Secrets YAML configuration make sure to type the fileName correctly and use pipe operator to add file as text file