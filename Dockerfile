FROM oven/bun
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
COPY . .
RUN bun install
EXPOSE 3000
CMD ["bun", "src/index.ts"]
