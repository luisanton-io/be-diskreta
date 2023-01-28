import shared, { emptyQueue } from "../shared"

export default function messageStatus(msg: OutgoingMessageWithSender | ReceivedMessage, status: OutgoingMessageStatus) {
    const statusUpdate: MessageStatusUpdate = {
        chatId: msg.chatId,
        hash: msg.hash,
        recipientId: msg.for,
        status
    }
    const { socket } = shared.onlineUsers[msg.sender._id.toString()] || {}

    if (socket) {
        console.log(`Emitting message status update [${statusUpdate.status}] to sender (${msg.sender.nick})`)
        socket.emit('msg-status', statusUpdate)
    } else {
        (shared.queues[msg.sender._id] ||= emptyQueue).status.push(statusUpdate)
    }
}
