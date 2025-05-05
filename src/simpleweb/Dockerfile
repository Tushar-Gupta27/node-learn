FROM node:16-alpine

WORKDIR /usr/src/app

ARG SOMEVAR
ENV TEST2=$SOMEVAR
RUN echo "ARGS:$SOMEVAR"
RUN echo "ENV: $TEST2"

RUN echo "ENV Name: $name"
RUN echo "ENV age: $age"
RUN echo "ENV job: $job"

# COPY ./package*.json ./
COPY ./package.json ./
RUN npm install
# RUN npm ci --only=production to install dependencies only for production (when making for prod)


COPY ./ ./

CMD ["npm","run","start"]