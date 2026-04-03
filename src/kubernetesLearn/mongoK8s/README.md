# SECRETS
- secret value stored should be base64 encoded
- `echo -n '' | base64`
- Create Secret before deployment or service
- when using secrets in deployment - use valueFrom & add secretKeyRef
- `apiVersion: v1`

---

# SERVICE
- selector app name should match deployment spec name
- i think app name inside spec is used to check if replicas have same name & count them
- targetPort is port to connect to the pod inside
- port is the service port - which other pods can use to connect to
- `apiVersion: v1`
- checking if correct pods are in the service - `use describe` and check endpoints value
  
### EXTERNAL SERVICE
- requires a type of `LoadBalancer` 
  - default is `ClusterIP` which makes an internal service
  - another is `NodePort` which also makes a external service - but use `LoadBalancer` and in actual setups you can connect it to a load balancer service in your K8s etc
    - when using actual cloud services we can get public IP using `kubectl get all` and see the `EXTERNAL-IP` but for minikube need to use `minikube service serviceName` - 
    - ### to allow service to be available from localhost
    - [Different_Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- need to a nodePort `30000` check limits - `30000-32767` port limit
- 

---

# DEPLOYMENT
- `apiVersion: apps/v1`

---

# CONFIGMAP
- can directly use service name as host -> as DNS will resolve it
- when using config value in deployment use valueFrom & add configMapKeyRef
- need to be configured before using it somewhere

---

# MISC
- [Diff_between_app.k8s.io/name_vs_name](https://discuss.kubernetes.io/t/how-do-metadata-name-labels-name-and-app-kubernetes-io-name-relate-to-each-other/22418/2)
- For Mongo-Express use mongodb connection string instead of 3 different env - dockerhub has not been updated
  - [Issue](https://github.com/mongo-express/mongo-express-docker/issues/113)
  - `mongodb://user:pass@host:port`