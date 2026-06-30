import { body, validationResult } from "express-validator";


const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next()
    }
    res.send({ errors: errors.array() });
}


export const newGroupChatValidator = [
    body("name").isString().withMessage("Name should be a string"),
    validate
]