import { Socket } from "socket.io";

interface Shared {
    onlineUsers: { _id: string, sockets: Socket[] }[],
    messageQueue: Record<User["_id"], Message[]>,
    statusQueue: Record<User["_id"], MessageStatusUpdate[]>
}

const shared: Shared = {
    onlineUsers: [],
    messageQueue: {},
    statusQueue: {}
};

export default shared