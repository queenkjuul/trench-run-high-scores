require("dotenv").config()
const { JsonDB, Config } = require("node-json-db")
const express = require("express")
const cors = require("cors")
const crypto = require("node:crypto")
const response = require("./response")
const app = express()
const port = 8080
const { AES_KEY } = process.env

var db = new JsonDB(new Config("trenchHighScores", true, false, "/"))

initDb()

app.use(cors())
app.use(express.json())

app.get("/scores", async (req, res) => {
  db.getData("/scores").then((scores) => {
    res.send(scores.sort((a, b) => b?.score - a?.score))
  })
})

app.get("/scores/top", async (req, res) => {
  db.getData("/scores").then((scores) => {
    res.send(scores.sort((a, b) => b?.score - a?.score)[0])
  })
})

app.post("/scores", async (req, res) => {
  if (!req.body) {
    res.status(400).send("Invalid request")
    return
  }

  const { data, iv: ivB64 } = req.body
  if (!data) {
    res.status(400).send("Invalid request")
    return
  }
  if (!ivB64) {
    res.status(403).send(response)
    return
  }
  db.getData("/usedKeys").then((keys) => {
    if (keys[ivB64]) {
      res.status(403).send(response)
    }
  })

  const algorithm = "aes-256-cbc"
  const key = Buffer.from(AES_KEY, "hex")
  const iv = Buffer.from(ivB64, "base64")

  db.push("/usedKeys", { [ivB64]: ivB64 }, false)

  let encrypted
  let decrypted

  try {
    encrypted = Buffer.from(data, "base64")
    let decipher = crypto
      .createDecipheriv(algorithm, key, iv)
      .setAutoPadding(false)
    decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])
  } catch (e) {
    console.error(e)
    res.status(403).send(response)
    return
  }

  const scoreData = JSON.parse(decrypted.toString())
  const { name, score, level } = scoreData

  if (!name || !score || !level) {
    res.status(400).send("Invalid Request")
    return
  }

  db.getData("/scores").then((scores) => {
    scoreData.date = new Date()
    scores.push(scoreData)
    db.push("/scores", scores).then((scores) => res.send(scores))
  })
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

async function initDb() {
  try {
    await db.getData("/scores")
  } catch (e) {
    await db.push("/scores", [])
    await db.push("/usedKeys", {}, false)
  }
}
