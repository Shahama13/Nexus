export const errorMiddleware = (err, req, res, next) => {
    console.error(err.stack);

    return res.status(err.statusCode || 500).json({ message: err.message || 'Internal Server Error' });
}

export const tryCatchWrapper = (fn) => {
    return async (req, res, next) => {
        try {
            await fn(req, res, next);
        } catch (error) {
            next(error);
        }
    };
} 

export class CustomError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }   
}