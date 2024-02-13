FROM bunshinsaba/bun

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN bun install

# Bundle app source
COPY . .

EXPOSE 3000
CMD ["bun", "start"]
