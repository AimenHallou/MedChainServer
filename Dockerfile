FROM oven/bun
COPY . .
RUN bun install
EXPOSE 4000
CMD ["bun", "src/index.ts"]
