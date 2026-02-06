FROM node:22-alpine

WORKDIR /build

# Install build tools
RUN apk add --no-cache git

# Source docs will be mounted at /source, output at /output
VOLUME ["/source", "/output"]

COPY build.sh /build/build.sh
RUN chmod +x /build/build.sh

ENTRYPOINT ["/build/build.sh"]
