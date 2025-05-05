#Use an existing docker image as a base
FROM alpine
# download & install a dependency
RUN apk add --update redis
# tell the image what todo when it starts
CMD ["redis-server"]