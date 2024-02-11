FROM oven/bun
COPY . .
RUN bun install
EXPOSE 8080
CMD ["bun", "src/index.ts"]
