import Pusher from "pusher-js"

const pusher = new Pusher("ce14022937ba3e24f690", {
  cluster: "ap3",
  encrypted: true,
})

export default pusher
