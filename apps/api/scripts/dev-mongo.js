// Local MongoDB on :27017 without Docker (data kept in apps/api/.mongo-data).
// With Docker available, prefer: docker compose up mongo
const { mkdirSync } = require("node:fs")
const { resolve } = require("node:path")
const { MongoMemoryServer } = require("mongodb-memory-server")

const dbPath = resolve(__dirname, "../.mongo-data")
mkdirSync(dbPath, { recursive: true })

MongoMemoryServer.create({
  instance: { port: 27017, dbPath, storageEngine: "wiredTiger" },
})
  .then((server) => {
    console.log(`MongoDB ready at ${server.getUri()} (Ctrl+C to stop)`)
    const stop = () =>
      server.stop({ doCleanup: false }).then(() => process.exit(0))
    process.on("SIGINT", stop)
    process.on("SIGTERM", stop)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
