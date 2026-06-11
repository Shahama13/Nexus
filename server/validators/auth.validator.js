import { body, validationResult } from "express-validator";


const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next()
    }
    res.send({ errors: errors.array() });
}


export const signUpValidator = [
    body("email").isEmail().withMessage("Email address should be valid"),
    body("name").isString().isLength({min:3, max:20}).withMessage("Name should be between 3 to 20 characters"),,
    body("password").isLength({min:6, max:12}).withMessage("Password should be between 6 to 12 characters"),
    validate
]