import shared from "../shared"

export default function messageStatus(msg: Message, status: MessageStatus) {
    const statusUpdate: MessageStatusUpdate = {
        chatId: msg.chatId,
        hash: msg.hash,
        recipientId: msg.for,
        status
    }
    const sender = shared.onlineUsers.find(u => u._id === msg.sender._id.toString())
    const { sockets } = sender || {}

    if (sockets) {
        console.log(`Emitting message status update [${statusUpdate.status}] to sender (${msg.sender.nick})`)
        sockets.forEach(s => s.emit('msg-status', statusUpdate))
    } else {
        (shared.statusQueue[msg.sender._id] ||= []).push(statusUpdate)
    }
}
