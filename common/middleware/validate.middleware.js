import ApiError from "../ApiError";
import BaseDto from "../dto/base.dto.js";

const validateMiddleware = (dto) => {
    return (req, res, next) => {
        const result = dto.validate(req.body);
        if (result.error) {
           next(ApiError.badRequest("Validation Error",result.error));
           return;
        }
        req.body = result.data;
        next();
    }
}

module.exports = validateMiddleware;