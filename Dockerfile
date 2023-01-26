FROM node:18 as build-env
COPY . /app
WORKDIR /app

RUN sed -i 's|deb.debian.org|deb.debian.org|g' /etc/apt/sources.list && apt-get update -qq && apt-get install -y ffmpeg 
RUN npm install
RUN rm -rf node_modules && npm install --production --ignore-scripts

FROM node:18
RUN mv /root /root.orig && mkdir -p /root && \
	sed -i 's|deb.debian.org|deb.debian.org|g' /etc/apt/sources.list && \
	apt-get update && \
	apt-get install -y ffmpeg && \
	rm -rf /root && mv /root.orig /root && \
	rm -rf /var/cache/* && \
	rm -rf /var/lib/apt && \
	rm -rf /var/log/*

COPY --from=build-env /app /app
WORKDIR /app

ENTRYPOINT ["/usr/local/bin/node", "/app/dist/index.js"]
