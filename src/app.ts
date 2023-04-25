import express from "express";
import cors, { CorsOptions } from "cors";
import genericErrorHandler from "./middlewares/errorHandler";
import usersRouter from "./users";
import jwt from "./util/jwt";
import User from "./users/model";
import { makeEmptyQueues } from "./shared";
import messageStatus from "./events/messageStatus";

const app = express();

const whitelist = [
    'http://localhost:3000',
    'https://diskreta.vercel.app',
    'http://prometheus.local:3000',
]
const corsOptions: CorsOptions = {
    origin: function (origin, callback) {
        if (!origin || whitelist.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    }
}


const apiRouter = express.Router();
apiRouter.use(express.json())
apiRouter.use(cors(corsOptions));

apiRouter.use('/users', usersRouter)

apiRouter.get('/test', (req, res) => {
    res.status(200).send({ message: "Hello, World!" })
})
apiRouter.get('/queues', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]
        if (!token) throw new Error("No token provided")

        const { _id } = jwt.verify(token, process.env.JWT_SECRET!) as { _id: string }
        const user = await User.findById(_id)

        if (!user) throw new Error("User not found")

        await Promise.all(
            user.queues.messages.map(msg =>
                messageStatus(msg, 'delivered')
            )
        )

        await user.updateOne({
            queues: makeEmptyQueues()
        })

        res.status(200).send(user.queues)
    } catch (error) {
        res.status(400).send({ message: (error as Error).message })
    }
})

apiRouter.use(genericErrorHandler)

app.use('/api', apiRouter)


export default app