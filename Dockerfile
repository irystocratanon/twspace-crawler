FROM node:18-bullseye as build-env
COPY . /app
WORKDIR /app

RUN npm install
RUN rm -rf node_modules && npm install --omit=dev --ignore-scripts
RUN mkdir -pv /tools && cd /tools && wget -q -O - https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz | xzcat | tar --strip-components=1 -xf - && /tools/ffmpeg -version

FROM gcr.io/distroless/nodejs18-debian11

COPY --from=build-env /app/package.json /package.json
COPY --from=build-env /app/dist /app
COPY --from=build-env /app/node_modules /app/node_modules
COPY --from=build-env /tools/ffmpeg /tools/ffmpeg
#ADD busybox.static /busybox.static
WORKDIR /app

ENV PATH /tools:/nodejs/bin/:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ENTRYPOINT ["/nodejs/bin/node", "/app/index.js"]
