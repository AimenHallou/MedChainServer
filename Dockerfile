FROM oven/bun
COPY . .
RUN bun install
EXPOSE 4000
EXPOSE 443
CMD ["bun", "src/index.ts"]
