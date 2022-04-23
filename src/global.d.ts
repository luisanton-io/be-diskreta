interface User {
    _id: string
    nick: string
    pubkey: string
    password?: string
}

interface JWTPayload {
    _id: string
}

namespace Express {
    interface Request {
        user?: string
    }
}