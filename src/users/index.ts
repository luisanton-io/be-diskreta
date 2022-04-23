import express from "express"
import jwt from "jsonwebtoken"
import User from "./model"
import bcrypt from "bcrypt"
import createHttpError from "http-errors"

const usersRouter = express.Router()

usersRouter
    .post("/", async (req, res, next) => {
        try {
            const password = await bcrypt.hash(req.body.password, 12)
            const user = new User({
                ...req.body,
                password
            })
            await user.save()
            const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET!)

            res.status(201).send({ token, user })
        } catch (error) {
            next(error)
        }
    })
    .post("/session", async (req, res, next) => {
        try {
            const { email, password } = req.body

            if (!email || !password) {
                return next(createHttpError(400, "MISSING_CREDENTIALS"))
            }
            const user = await User.findOne({ email })

            if (!user || !(await user.checkPassword(password))) {
                return res.status(401).json({
                    error: "Invalid credentials"
                })
            }

            const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET!)

            res.status(200).send({ token, user })
        } catch (e) {
            next(e)
        }
    })

export default usersRouter