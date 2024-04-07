const { JsonDB, Config } = require("node-json-db")
const express = require("express")
const app = express()
const port = 8080

var db = new JsonDB(new Config("trenchHighScores", true, false, "/"))

initDb()

app.use(express.json())

app.get("/scores", async (req, res) => {
  console.log(req)
  db.getData("/scores").then((scores) => {
    res.send(scores.sort((a, b) => b?.score - a?.score))
  })
})

app.post("/scores", async (req, res) => {
  console.log(req.body)
  if (!req?.body?.name || !req?.body?.level || !req?.body?.score) {
    res.status(400).send("Invalid request")
  } else {
    db.getData("/scores").then((scores) => {
      scores.push(req.body)
      db.push("/scores", scores).then((scores) => res.send(scores))
    })
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

async function initDb() {
  try {
    await db.getData("/scores")
  } catch (e) {
    console.error(e)
    await db.push("/scores", [])
  }
}
