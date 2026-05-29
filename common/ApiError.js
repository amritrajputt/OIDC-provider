class ApiError extends Error{
    constructor(statusCode, message, error = []){
        super(message);
        this.statusCode = statusCode;
        this.error = error;
        this.name = 'ApiError';
        this.isOperational = true;
    }
    static badRequest(message, error){
        return new ApiError(400, message, error);
    }
    static unauthorized(message, error){
        return new ApiError(401, message, error);
    }
    static forbidden(message, error){
        return new ApiError(403, message, error);
    }
    static notFound(message, error){
        return new ApiError(404, message, error);
    }
    static internalServerError(message, error){
        return new ApiError(500, message, error);
    }
}

module.exports = ApiError;