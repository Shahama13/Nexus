import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { tryCatchWrapper ,CustomError} from "./error.middleware.js";

export const authenticateToken = tryCatchWrapper(async (req, res, next) => {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return next(new CustomError("Access Denied", 401));
    }
  
        const verified = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(verified?.id).select("-password")

        if (!user)
            return next(new CustomError("Access Denied", 401));

        req.user = user;
        next();
        
 
});  