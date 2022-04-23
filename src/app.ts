import express from "express";
import genericErrorHandler from "./middlewares/errorHandler";
import usersRouter from "./users";

const app = express();

app.use(express.json())

const apiRouter = express.Router();

apiRouter.use('/users', usersRouter)

app.use('/api', apiRouter)

app.use(genericErrorHandler)

export default app