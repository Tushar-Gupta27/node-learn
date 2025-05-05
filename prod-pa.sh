export DATABASE_URL=postgres://tushar_gupta:fekrhiehiqwheie243324ufbcjwjf@cmdb.citymall.live/cmdb
export DATABASE_URL_REPLICA=postgres://tushar_gupta:fekrhiehiqwheie243324ufbcjwjf@cmdb.citymall.live/cmdb
export DATABASE_URL_REPLICA2=postgres://tushar_gupta:fekrhiehiqwheie243324ufbcjwjf@cmdb.citymall.live/cmdb
export DATABASE_URL_ALT=postgres://tushar_gupta:fekrhiehiqwheie243324ufbcjwjf@cmdb.citymall.live/cmdb
export REDIS_PORT=6380
export ANALYTICS_REDIS_PORT=6380
export KAFKA_BROKERS=localhost:9093
export ANALYTICS_KAFKA_BROKERS=localhost:9093
export ORDERS_OPENSEARCH_HOST=https://vpc-order-search-xr3q7hy3awsrmog36yh6tpdghu.ap-south-1.es.amazonaws.com
export ORDERS_OPENSEARCH_USERNAME=tushar
export ORDERS_OPENSEARCH_PASSWORD='f&wihBYD@e%Ku9'
export ORDERS_OPENSEARCH_ORDERS_INDEX=orders
export WALLET_TXN_OPENSEARCH_HOST=https://vpc-cm-search-2-f76ydx32kbysu44vih73s4rl2e.ap-south-1.es.amazonaws.com
export WALLET_TXN_OPENSEARCH_USERNAME=tushar
export WALLET_TXN_OPENSEARCH_PASSWORD='Y#f9PGuDw6y$9N'
export WALLET_TXN_OPENSEARCH_INDEX=cmdb_p1.public.wallet_transactions
# export NODE_ENV=production
# export APP_ENV=production
# echo APP_ENV=$APP_ENV
echo DATBASE_URL=$DATABASE_URL
echo REDIS_PORT=$REDIS_PORT
echo KAFKA_BROKERS=$KAFKA_BROKERS
echo ORDERS_OPENSEARCH_HOST=$ORDERS_OPENSEARCH_HOST
echo ORDERS_OPENSEARCH_ORDERS_INDEX=$ORDERS_OPENSEARCH_ORDERS_INDEX
echo WALLET_TXN_OPENSEARCH_HOST=$WALLET_TXN_OPENSEARCH_HOST
echo WALLET_TXN_OPENSEARCH_INDEX=$WALLET_TXN_OPENSEARCH_INDEX

docker start redis-server
echo REDIS_SERVER_RUNNING

cd ./dev/citymall-services
git stash apply $(git stash list | grep leaderMW | cut -d : -f 1)
nodemon packages/server/src/customer/partner-apis.js

trap "echo HELLO SIGINT" SIGINT
docker stop redis-server
sleep 1
echo REDIS_SERVER_STOPPED
git restore .
cd ../..
kill -2 $$