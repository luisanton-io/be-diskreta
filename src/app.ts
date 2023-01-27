import express from "express";
import cors, { CorsOptions } from "cors";
import genericErrorHandler from "./middlewares/errorHandler";
import usersRouter from "./users";

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

apiRouter.use(genericErrorHandler)

app.use('/api', apiRouter)


export default app