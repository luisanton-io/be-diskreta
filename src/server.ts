import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";
import messageStatus from "./events/messageStatus";
import shared, { makeEmptyQueue } from "./shared";
import User from "./users/model";
import jwt from "./util/jwt";

const httpServer = createServer(app);
const io = new Server(httpServer, {
    maxHttpBufferSize: 1e8,
    pingTimeout: 60000
});

io.use((socket, next) => {
    try {

        const token = socket.handshake.auth.token || socket.handshake.headers.token
        const { _id } = jwt.verify(token, process.env.JWT_SECRET!) as { _id: string }

        if (!_id) throw new Error()

        next()
    } catch (error) {
        socket.emit("jwt-expired")
    }

})

io.on("connection", async socket => {

    try {
        const { _id } = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET!) as JWTPayload

        const socketUser = await User.findById(_id)

        if (!socketUser) throw new Error("User not found");

        console.log("Connected " + socketUser.nick)

        shared.onlineUsers[_id]?.socket.disconnect()

        shared.onlineUsers[_id] = { socket }

        shared.queues[_id] && socket.emit('dequeue', shared.queues[_id], async () => {

            await Promise.all(
                shared.queues[_id].messages.map(msg =>
                    messageStatus(msg, 'delivered')
                )
            )

            delete shared.queues[_id]
        })

        socket.on("out-msg", async (payload: OutgoingMessage, ack) => {
            console.log({ 'Received message': payload })

            const recipientId = payload.for

            ack(recipientId)

            const outgoingMessage: OutgoingMessageWithSender = {
                ...payload,
                sender: socketUser.toJSON() // avoids a malicious user with a legit JWT token to impersonate another user.
            }

            const forwardingMessage: ReceivedMessage = {
                ...outgoingMessage,
                status: 'new'
            }

            const onlineRecipient = shared.onlineUsers[recipientId]

            const deliverMessage = () =>
                !!onlineRecipient && new Promise<boolean>((resolve, reject) => {
                    onlineRecipient.socket.emit("in-msg", forwardingMessage, async (msgack: string) => {
                        const { hash, error } = JSON.parse(msgack) as MessageAck
                        if (error) {
                            console.log('in-msg ACK ERROR', error)
                            return reject(false)
                        }

                        await messageStatus(outgoingMessage, 'delivered')
                        console.log("received ack for ", hash)
                        resolve(true)
                    })
                }).catch(console.error)

            if (!await deliverMessage()) {
                (shared.queues[recipientId] ||= makeEmptyQueue()).messages.push(forwardingMessage);
            }

        })

        socket.on("read-msg", async (message: ReceivedMessage) => {
            await messageStatus(message, 'read')
        })

        socket.on('disconnect', () => {
            console.log("disconnecting " + socketUser.nick)
            delete shared.onlineUsers[_id]
        })

        socket.onAny((event, payload) => {
            socket.emit("echo", { event, payload })
        })

    } catch (error) {
        console.log(error)
    }

});

export default httpServer