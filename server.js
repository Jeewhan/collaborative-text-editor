require("dotenv").config()
let express = require("express")
let bodyParser = require("body-parser")
let Pusher = require("pusher")
let app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

// enable cross-origin resource sharing
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  )
  next()
})

// create a Pusher client
let pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_APP_KEY,
  secret: process.env.PUSHER_APP_SECRET,
  cluster: process.env.PUSHER_APP_CLUSTER,
})

// create a home route to test if the server works
app.get("/", function (req, res) {
  res.send("all green")
})

// create a "editor-text" route to update Pusher the latest state of our editor
app.post("/editor-text", function (req, res) {
  if (req.body.text) {
    // send a 'editor-update' event on the 'editor' channel with the editor current state
    pusher.trigger(
      "editor",
      "editor-update",
      {
        text: req.body.text,
        selection: req.body.selection,
      },
      req.body.socketId
    )
    res
      .status(200)
      .send({ success: true, message: "editor update broadcasted" })
  } else {
    res
      .status(400)
      .send({ success: false, message: "editor update not broadcasted" })
  }
})

let port = process.env.PORT || 5000
console.log(`server running on port ${port}`)
// run the server on our specified port
app.listen(port)
