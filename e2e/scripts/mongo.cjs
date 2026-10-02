// Throwaway in-memory MongoDB for the browser tests (started by Playwright).
const { MongoMemoryServer } = require("mongodb-memory-server")

const port = Number(process.env.E2E_MONGO_PORT ?? 27018)

MongoMemoryServer.create({ instance: { port } })
  .then((server) => {
    console.log(`MongoDB ready at ${server.getUri()}`)
    const stop = () => server.stop().then(() => process.exit(0))
    process.on("SIGINT", stop)
    process.on("SIGTERM", stop)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
