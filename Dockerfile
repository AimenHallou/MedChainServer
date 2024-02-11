FROM oven/bun
COPY . .
RUN bun install
EXPOSE 4000/tcp
CMD ["bun", "src/index.ts"]
