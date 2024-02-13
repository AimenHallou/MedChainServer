FROM oven/bun
# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
COPY . .
RUN bun install
EXPOSE 3000
CMD ["bun", "src/index.ts"]
