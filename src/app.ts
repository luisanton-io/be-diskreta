import express from "express";
import cors, { CorsOptions } from "cors";
import genericErrorHandler from "./middlewares/errorHandler";
import usersRouter from "./users";

const app = express();

const whitelist = ['http://localhost:3000', 'https://diskreta.vercel.app']
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

app.use('/api', apiRouter)

app.use(genericErrorHandler)

export default app