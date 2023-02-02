import shared, { makeEmptyQueue } from "../shared"

export default async function messageStatus(msg: OutgoingMessageWithSender | ReceivedMessage, status: OutgoingMessageStatus) {
    const statusUpdate: MessageStatusUpdate = {
        chatId: msg.chatId,
        hash: msg.hash,
        recipientId: msg.for,
        status
    }
    const { socket } = shared.onlineUsers[msg.sender._id.toString()] || {}

    if (!(socket &&
        await new Promise((resolve) => {
            // console.log(`Emitting message status update [${statusUpdate.status}] to sender (${msg.sender.nick})`)
            const timeout = setTimeout(() => {
                // console.log(`${msg.sender.nick}'s socket timed out...`)
                resolve(false)
            }, 3000)

            socket.emit('msg-status', statusUpdate, () => {
                // console.log(`${msg.hash} status update ackd: ${statusUpdate.status}`)
                clearTimeout(timeout)
                resolve(true)
            })
        }))) {
        // console.log("pushing to queue STATUS ", msg.hash, statusUpdate.status);
        (shared.queues[msg.sender._id] ||= makeEmptyQueue()).status.push(statusUpdate)
    }
}
