const { verifySocketRole } = require("../authorization/verify_role");

exports.userSocketContext = function (userSocket) {

    userSocket.use(verifySocketRole("user|admin"))

    userSocket.on("connection", (socket) => {
        console.log(socket.id);

        socket.on("join-election-room", (_) => {
            socket.join("election")
            console.log("joined room");
        })

        socket.on("vote-updated", (data) => {
            console.log(data);
            console.log("vote got updated in user namespace");
        })

        socket.on("disconnect", () => {
            console.log(socket.id + " disconnected");

        })
    })
}