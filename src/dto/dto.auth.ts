import Joi from "joi";

const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().required(),
    password: Joi.string().min(6).required()
})

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    client_id: Joi.string().optional()
})

export {
    registerSchema,
    loginSchema
}